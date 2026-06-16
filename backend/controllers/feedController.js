const asyncHandler = require("../middleware/asyncHandler");
const Trend = require("../models/Trend");
const User = require("../models/User");
const { Types } = require("mongoose");
const { getRealTrends } = require("../services/data");
const { TREND_PERSIST_LIMIT, TREND_ANALYSIS_LIMIT } = require("../config/config");
const { generateBatchAnalysis, generateTrendAnalysis } = require("../services/aiService");
const { predictTrend } = require("../services/mlService");
const { saveTrends, scoreTrends, getFeedTrends, getTrendById, getRelatedTrends } = require("../services/trendService");

const ALLOWED_PREDICTIONS = ['HIGH', 'LOW', 'UNAVAILABLE'];

const normalizePredictionValue = (value) => {
  if (value === null) return null;
  if (typeof value === 'object' && value !== null) {
    if (typeof value.classification === 'string') return value.classification.trim().toUpperCase();
    if (typeof value.ml_prediction === 'string') return value.ml_prediction.trim().toUpperCase();
    return 'UNAVAILABLE';
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === '1') return 'HIGH';
    if (normalized === '0') return 'LOW';
    return normalized;
  }
  return 'UNAVAILABLE';
};

const safePredictionValue = (value) => {
  const normalized = normalizePredictionValue(value);
  if (normalized === null) return 'UNAVAILABLE';
  if (!ALLOWED_PREDICTIONS.includes(normalized)) return 'UNAVAILABLE';
  return normalized;
};

const shouldRefreshRedditPrediction = (trend) => {
  if (!trend || String(trend.source || '').toLowerCase().indexOf('reddit') === -1) return false;
  const normalized = normalizePredictionValue(trend.ml_prediction);
  return normalized === null || normalized === 'UNKNOWN' || normalized === 'UNAVAILABLE';
};

const refreshRedditPrediction = async (trend) => {
  if (!shouldRefreshRedditPrediction(trend)) {
    return safePredictionValue(trend.ml_prediction);
  }

  const predicted = await predictTrend(trend);
  const normalized = normalizePredictionValue(predicted);
  const safeValue = safePredictionValue(normalized);
  if (trend?._id && typeof trend._id !== 'undefined') {
    await Trend.findByIdAndUpdate(
      trend._id,
      { $set: { ml_prediction: safeValue || 'UNAVAILABLE', updatedAt: new Date() } },
      { new: true }
    ).catch(() => null);
  }
  return safeValue;
};

const FALLBACK_CACHE_PATTERNS = [
  /ai unavailable/i,
  /no idea available/i,
  /ce signal gagne en visibilité/i,
  /le sujet est visible dans les signaux actuels/i,
  /construisez une mini-édition/i,
  /créer un extrait de veille rapide/i,
  /préparer un angle business ou newsletter autour de/i,
  /transformer le sujet en mini-briefing/i
];

const hasRealStoredAnalysis = (analysis, idea) => {
  if (typeof analysis !== 'string' || !analysis.trim()) return false;
  if (typeof idea !== 'string' || !idea.trim()) return false;

  const combined = `${analysis || ''}\n${idea || ''}`;
  return !FALLBACK_CACHE_PATTERNS.some((pattern) => pattern.test(combined));
};

const getFeed = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const forceRefresh = String(req.query.refresh || "false").toLowerCase() === "true";
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 12;
  const sort = req.query.sort || 'newest';
  const category = req.query.category || undefined;
  const source = req.query.source || undefined;
  const viral = req.query.viral === 'true' || req.query.viral === '1';
  const seenIds = String(req.query.seen || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const runtimeSeed = Math.random();

  const stored = await getFeedTrends({ page, limit, category, source, sort, viral, seenIds, runtimeSeed });
  const storedTrends = stored.data || [];
  const savedSet = new Set((user?.savedTrends || []).map(String));

  if (forceRefresh && user && typeof user.aiRemaining === 'number' && user.aiRemaining <= 0) {
    const error = new Error("Votre quota d'analyses IA est épuisé. Revenez demain.");
    error.statusCode = 429;
    return next(error);
  }

  if (storedTrends && storedTrends.length > 0 && !forceRefresh) {
    let filteredStored = storedTrends;
    if (user?.preferences?.length > 0) {
      const prefs = user.preferences.map(p => p.toLowerCase());
      const matched = storedTrends.filter(trend => prefs.some(pref => String(trend.title || '').toLowerCase().includes(pref)));
      if (matched.length > 0) filteredStored = matched;
    }

    const finalStored = filteredStored.length > 0 ? filteredStored : storedTrends;

    const items = await Promise.all(finalStored.map(async (trend) => ({
      id: trend._id,
      _id: trend._id,
      title: trend.title,
      score: trend.score,
      source: trend.source,
      category: trend.category,
      popularity: trend.popularity || 0,
      growth: trend.growth || 0,
      image: trend.image || '',
      video: trend.video || '',
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
      analysis: trend.analysis || '',
      idea: trend.idea || '',
      link: trend.link || '',
      ml_prediction: await refreshRedditPrediction(trend),
      createdAt: trend.createdAt,
      savedCount: trend.savedCount || 0,
      isSaved: savedSet.has(String(trend._id))
    })));

    return res.status(200).json({
      items,
      meta: stored.meta || { total: finalStored.length, page, limit, totalPages: 1, hasMore: false, sourceCounts: {}, categoryCounts: {} },
      user: {
        aiRemaining: user?.aiRemaining ?? 0
      }
    });
  }

  const rawTrends = await getRealTrends();
  if (!Array.isArray(rawTrends) || rawTrends.length === 0) {
    const error = new Error("No feed data available");
    error.statusCode = 503;
    return next(error);
  }

  const scoredTrends = scoreTrends(rawTrends).slice(0, Math.max(24, Number(TREND_PERSIST_LIMIT || 1000)));
  const analysisBatch = scoredTrends.slice(0, Math.min(scoredTrends.length, Number(TREND_ANALYSIS_LIMIT || 250)));

  if (forceRefresh && user) {
    user.aiRemaining = Math.max(0, (user.aiRemaining || 0) - 1);
    await user.save();
  }

  const trends = await generateBatchAnalysis(analysisBatch);

  const predictions = await Promise.all(
    trends.map((trend) => predictTrend(trend))
  );

  const enrichedTrends = trends.map((trend, index) => ({
    ...trend,
    ml_prediction: predictions[index]
  }));

  const persistedTrends = await saveTrends(enrichedTrends);

  let filteredTrends = persistedTrends;
  if (user?.preferences?.length > 0) {
    filteredTrends = persistedTrends.filter((trend) =>
      user.preferences.some((pref) =>
        trend.title.toLowerCase().includes(pref.toLowerCase())
      )
    );
  }

  const finalTrends = filteredTrends.length > 0 ? filteredTrends : persistedTrends;

  const items = await Promise.all(finalTrends.map(async (trend) => ({
    id: trend._id,
    _id: trend._id,
    title: trend.title,
    score: trend.score,
    source: trend.source,
    category: trend.category,
    popularity: trend.popularity || 0,
    growth: trend.growth || 0,
    image: trend.image || '',
    video: trend.video || '',
    thumbnail: trend.thumbnail || '',
    mediaType: trend.mediaType || 'none',
    analysis: trend.analysis || '',
    idea: trend.idea || '',
    link: trend.link || '',
    ml_prediction: await refreshRedditPrediction(trend),
    createdAt: trend.createdAt,
    savedCount: trend.savedCount || 0,
    isSaved: savedSet.has(String(trend._id))
  })));

  const response = {
    items,
    meta: {
      total: stored.meta?.total || finalTrends.length,
      page: stored.meta?.page || page,
      limit: stored.meta?.limit || limit,
      totalPages: stored.meta?.totalPages || 1,
      hasMore: stored.meta?.hasMore || false
    },
    user: {
      aiRemaining: user?.aiRemaining ?? 0
    }
  };

  res.status(200).json(response);
});

const getTrendDetail = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const id = String(req.params.id || '').trim();

  if (!Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid trend ID format');
    err.statusCode = 400;
    return next(err);
  }

  const trend = await getTrendById(id);
  if (!trend) {
    const err = new Error('Trend not found');
    err.statusCode = 404;
    return next(err);
  }

  const isSaved = new Set((user?.savedTrends || []).map(String)).has(String(trend._id));

  const related = await getRelatedTrends(trend._id, { category: trend.category, tags: trend.tags || [], source: trend.source, limit: 6 }).catch(() => []);

  const relatedLight = (related || []).map((t) => ({
    id: t._id,
    title: t.title,
    thumbnail: t.thumbnail || t.image || '',
    mediaType: t.mediaType || 'none',
    score: t.score || 0,
    source: t.source
  }));

  res.status(200).json({
    id: trend._id,
    title: trend.title,
    excerpt: trend.excerpt || '',
    analysis: trend.analysis || '',
    idea: trend.idea || '',
    ml_prediction: safePredictionValue(trend.ml_prediction),
    score: trend.score || 0,
    scoreDetails: trend.scoreDetails || {},
    source: trend.source,
    category: trend.category,
    image: trend.image || '',
    video: trend.video || '',
    thumbnail: trend.thumbnail || '',
    mediaType: trend.mediaType || 'none',
    link: trend.link || '',
    createdAt: trend.createdAt,
    updatedAt: trend.updatedAt,
    fetchedAt: trend.fetchedAt,
    savedCount: trend.savedCount || 0,
    tags: Array.isArray(trend.tags) ? trend.tags : [],
    isSaved,
    related: relatedLight
  });
});

const analyzeTrend = asyncHandler(async (req, res, next) => {
  const id = String(req.params.id || '').trim();
  if (!Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid trend ID format');
    err.statusCode = 400;
    return next(err);
  }

  const trend = await getTrendById(id);
  if (!trend) {
    const err = new Error('Trend not found');
    err.statusCode = 404;
    return next(err);
  }

  const hasStoredAnalysis = Boolean(
    typeof trend.analysis === 'string' && trend.analysis.trim() &&
    typeof trend.idea === 'string' && trend.idea.trim()
  );
  const canReuseStoredAnalysis = hasStoredAnalysis && hasRealStoredAnalysis(trend.analysis, trend.idea);

  if (canReuseStoredAnalysis) {
    // Ensure ml_prediction is fresh for Reddit when returning stored analysis
    let mlPrediction = normalizePredictionValue(trend.ml_prediction);
    if (String(trend.source || '').toLowerCase().includes('reddit')) {
      try {
        const predicted = await predictTrend(trend);
        mlPrediction = safePredictionValue(predicted);
        await Trend.findByIdAndUpdate(trend._id, { $set: { ml_prediction: mlPrediction }, updatedAt: new Date() }).catch(() => null);
      } catch (err) {
        // keep existing value if prediction fails
      }
    }

    return res.status(200).json({
      trend: {
        id: trend._id,
        title: trend.title,
        source: trend.source,
        category: trend.category,
        score: trend.score || 0,
        scoreDetails: trend.scoreDetails || {},
        analysis: trend.analysis || '',
        idea: trend.idea || '',
        link: trend.link || '',
        image: trend.image || '',
        thumbnail: trend.thumbnail || '',
        mediaType: trend.mediaType || 'none',
        ml_prediction: safePredictionValue(mlPrediction)
      },
      analysis: {
        status: 'stored',
        summary: trend.analysis || '',
        opportunity: trend.idea || '',
        businessOpportunities: [trend.idea || ''],
        contentIdeas: [trend.idea || ''],
        prediction: trend.analysis || '',
        confidence: 'Medium'
      },
      aiRemaining: req.user?.aiRemaining ?? 0
    });
  }

  if (req.user && typeof req.user.aiRemaining === 'number' && req.user.aiRemaining <= 0) {
    const err = new Error("Votre quota d'analyses IA est épuisé. Revenez demain.");
    err.statusCode = 429;
    return next(err);
  }

  let reservedQuota = false;
  if (req.user && typeof req.user.aiRemaining === 'number') {
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, aiRemaining: { $gt: 0 } },
      { $inc: { aiRemaining: -1 } },
      { new: true }
    );

    if (!updatedUser) {
      const err = new Error("Votre quota d'analyses IA est épuisé. Revenez demain.");
      err.statusCode = 429;
      return next(err);
    }

    req.user.aiRemaining = updatedUser.aiRemaining;
    reservedQuota = true;
  }

  let analysis;
  try {
    analysis = await generateTrendAnalysis(trend);
  } catch (error) {
    if (reservedQuota) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { aiRemaining: 1 } }).catch(() => null);
      req.user.aiRemaining = Math.max(0, (req.user.aiRemaining || 0) + 1);
    }
    throw error;
  }

  const persistedAnalysis = analysis?.summary || trend.analysis || '';
  const persistedIdea = analysis?.opportunity || trend.idea || '';
  const mlPredictionObject = await predictTrend(trend);
  const mlPrediction = safePredictionValue(mlPredictionObject);

  await Trend.findByIdAndUpdate(
    trend._id,
    {
      $set: {
        analysis: persistedAnalysis,
        idea: persistedIdea,
        ml_prediction: mlPrediction,
        updatedAt: new Date()
      }
    },
    { new: true }
  ).lean().catch(() => null);

  if (reservedQuota && analysis?.status !== 'openrouter') {
    const restoredUser = await User.findByIdAndUpdate(req.user._id, { $inc: { aiRemaining: 1 } }, { new: true }).catch(() => null);
    req.user.aiRemaining = restoredUser ? restoredUser.aiRemaining : Math.max(0, (req.user.aiRemaining || 0) + 1);
  }

  res.status(200).json({
    trend: {
      id: trend._id,
      title: trend.title,
      source: trend.source,
      category: trend.category,
      score: trend.score || 0,
      scoreDetails: trend.scoreDetails || {},
      analysis: persistedAnalysis,
      idea: persistedIdea,
      link: trend.link || '',
      image: trend.image || '',
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
      ml_prediction: safePredictionValue(mlPrediction)
    },
    analysis: {
      ...analysis,
      status: analysis?.status || 'fallback'
    },
    aiRemaining: req.user?.aiRemaining ?? 0
  });
});

module.exports = { getFeed, getTrendDetail, analyzeTrend };