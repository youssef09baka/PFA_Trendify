const asyncHandler = require("../middleware/asyncHandler");
const Trend = require("../models/Trend");
const { getRealTrends } = require("../services/data");
const { TREND_PERSIST_LIMIT, TREND_ANALYSIS_LIMIT } = require("../config/config");
const { generateBatchAnalysis, generateTrendAnalysis } = require("../services/aiService");
const { predictTrend } = require("../services/mlService");
const { saveTrends, scoreTrends, getFeedTrends, getTrendById, getRelatedTrends } = require("../services/trendService");

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
  const sort = req.query.sort || 'score';
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

    return res.status(200).json({
      items: finalStored.map((trend) => ({
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
        ml_prediction: trend.ml_prediction || 'UNKNOWN',
        createdAt: trend.createdAt,
        savedCount: trend.savedCount || 0,
        isSaved: savedSet.has(String(trend._id))
      })),
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

  const response = {
    items: finalTrends.map((trend) => ({
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
      ml_prediction: trend.ml_prediction || 'UNKNOWN',
      createdAt: trend.createdAt,
      savedCount: trend.savedCount || 0,
      isSaved: savedSet.has(String(trend._id))
    })),
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
  const id = req.params.id;

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
    ml_prediction: trend.ml_prediction,
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
  const trend = await getTrendById(req.params.id);
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
        mediaType: trend.mediaType || 'none'
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

  const analysis = await generateTrendAnalysis(trend);

  const persistedAnalysis = analysis?.summary || trend.analysis || '';
  const persistedIdea = analysis?.opportunity || trend.idea || '';

  await Trend.findByIdAndUpdate(
    trend._id,
    {
      $set: {
        analysis: persistedAnalysis,
        idea: persistedIdea,
        updatedAt: new Date()
      }
    },
    { new: true }
  ).lean().catch(() => null);

  if (req.user && analysis?.status === 'openrouter') {
    req.user.aiRemaining = Math.max(0, (req.user.aiRemaining || 0) - 1);
    await req.user.save();
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
      mediaType: trend.mediaType || 'none'
    },
    analysis: {
      ...analysis,
      status: analysis?.status || 'fallback'
    },
    aiRemaining: req.user?.aiRemaining ?? 0
  });
});

module.exports = { getFeed, getTrendDetail, analyzeTrend };