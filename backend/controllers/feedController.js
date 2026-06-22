/**
 * Feed Controller
 * Generates personalized trends feed based on user preferences and trend scoring.
 * Handles feed retrieval, trend analysis, related trends, and AI insights.
 */

const asyncHandler = require("../middleware/asyncHandler");
const Trend = require("../models/Trend");
const User = require("../models/User");
const { Types } = require("mongoose");
const { getRealTrends } = require("../services/data");
const { TREND_PERSIST_LIMIT } = require("../config/config");
const { generateTrendAnalysis } = require("../services/aiService");
const { predictTrend } = require("../services/mlService");
const { saveTrends, scoreTrends, getFeedTrends, getTrendById, getRelatedTrends } = require("../services/trendService");

const ALLOWED_PREDICTIONS = ['HIGH', 'LOW', 'UNAVAILABLE'];
const SEARCH_SCAN_LIMIT = 500;

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

const clampFeedLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 12;
  return Math.min(Math.floor(parsed), 100);
};

const clampSearchLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.min(Math.floor(parsed), 50);
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const buildTrendSearchQuery = (rawQuery) => {
  const query = String(rawQuery || '').trim();
  if (!query) return null;

  const pattern = new RegExp(escapeRegex(query), 'i');
  return {
    $or: [
      { title: pattern },
      { tags: pattern },
      { category: pattern },
      { excerpt: pattern },
      { link: pattern }
    ]
  };
};

const calculateSearchRelevance = (trend, rawQuery) => {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 0;

  const words = query.split(/\s+/).filter((word) => word.length > 1);
  const title = normalizeSearchText(trend.title);
  const category = normalizeSearchText(trend.category);
  const tags = Array.isArray(trend.tags) ? normalizeSearchText(trend.tags.join(' ')) : '';
  const excerpt = normalizeSearchText(trend.excerpt);
  const link = normalizeSearchText(trend.link);

  let relevance = 0;
  if (title === query) relevance += 100;
  if (title.includes(query)) relevance += 70;
  if (tags.includes(query)) relevance += 45;
  if (category.includes(query)) relevance += 35;
  if (excerpt.includes(query)) relevance += 28;
  if (link.includes(query)) relevance += 20;

  words.forEach((word) => {
    if (title.includes(word)) relevance += 14;
    if (tags.includes(word)) relevance += 8;
    if (category.includes(word)) relevance += 6;
    if (excerpt.includes(word)) relevance += 5;
    if (link.includes(word)) relevance += 4;
  });

  return relevance;
};

const PREFERENCE_MAPPING = {
  tech: ['Tech'],
  gaming: ['Gaming'],
  business: ['Business'],
  education: ['Science'],
  health: ['Science'],
  society: ['Social', 'Discussion'],
  startup: ['Startups'],
  creator: ['Social', 'Entertainment', 'Web Culture']
};

const uniqueValues = (items = []) => [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
const uniqueLower = (items = []) => uniqueValues(items).map((item) => item.toLowerCase());

const buildPersonalizationProfile = (preferences = []) => {
  const activePreferences = uniqueLower(preferences).filter((pref) => PREFERENCE_MAPPING[pref]);
  if (!activePreferences.length) {
    return { personalized: false, activePreferences: [], allowedCategories: [] };
  }

  const allowedCategories = [];

  activePreferences.forEach((pref) => {
    allowedCategories.push(...PREFERENCE_MAPPING[pref]);
  });

  return {
    personalized: true,
    activePreferences,
    allowedCategories: uniqueValues(allowedCategories)
  };
};

const getFeed = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const forceRefresh = String(req.query.refresh || "false").toLowerCase() === "true";
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? clampFeedLimit(req.query.limit) : 12;
  const sort = req.query.sort || 'newest';
  const category = req.query.category || undefined;
  const source = req.query.source || undefined;
  const viral = req.query.viral === 'true' || req.query.viral === '1';
  const seenIds = String(req.query.seen || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const runtimeSeed = Math.random();
  const personalizationProfile = buildPersonalizationProfile(user?.preferences || []);
  const requestedPage = Math.max(1, Number(page) || 1);
  const requestedLimit = Number(limit);

  const stored = await getFeedTrends({
    page: requestedPage,
    limit: requestedLimit,
    category,
    categories: personalizationProfile.personalized ? personalizationProfile.allowedCategories : undefined,
    source,
    sort,
    viral,
    seenIds,
    runtimeSeed
  });
  const storedTrends = stored.data || [];
  const savedSet = new Set((user?.savedTrends || []).map(String));

  if (forceRefresh && user && typeof user.aiRemaining === 'number' && user.aiRemaining <= 0) {
    const error = new Error("Votre quota d'analyses IA est épuisé. Revenez demain.");
    error.statusCode = 429;
    return next(error);
  }

  if (storedTrends && storedTrends.length > 0 && !forceRefresh) {
    const finalStored = storedTrends;
    const responseMeta = {
      ...(stored.meta || { total: finalStored.length, sourceCounts: {}, categoryCounts: {} }),
      page: requestedPage,
      limit: requestedLimit,
      totalPages: Math.max(1, Math.ceil(Number(stored.meta?.total || finalStored.length) / requestedLimit)),
      hasMore: requestedPage < Math.max(1, Math.ceil(Number(stored.meta?.total || finalStored.length) / requestedLimit)),
      personalized: personalizationProfile.personalized,
      activePreferences: personalizationProfile.activePreferences
    };

    const items = await Promise.all(finalStored.map(async (trend) => ({
      id: trend._id,
      _id: trend._id,
      title: trend.title,
      score: trend.score,
      source: trend.source,
      category: trend.category,
      credibilityScore: trend.credibilityScore || 0,
      credibilityConfidence: trend.credibilityConfidence || 'low',
      verificationStatus: trend.verificationStatus || 'unverified',
      isFakeNews: Boolean(trend.isFakeNews),
      popularity: trend.popularity || 0,
      growth: trend.growth || 0,
      image: trend.image || '',
      video: trend.video || '',
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
      link: trend.link || '',
      ml_prediction: await refreshRedditPrediction(trend),
      createdAt: trend.createdAt,
      savedCount: trend.savedCount || 0,
      isSaved: savedSet.has(String(trend._id))
    })));

    return res.status(200).json({
      items,
      meta: responseMeta,
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

  if (forceRefresh && user) {
    user.aiRemaining = Math.max(0, (user.aiRemaining || 0) - 1);
    await user.save();
  }

  const predictions = await Promise.all(
    scoredTrends.map((trend) => predictTrend(trend))
  );

  const enrichedTrends = scoredTrends.map((trend, index) => ({
    ...trend,
    ml_prediction: predictions[index]
  }));

  const persistedTrends = await saveTrends(enrichedTrends);

  const filteredTrends = personalizationProfile.personalized
    ? persistedTrends.filter((trend) => personalizationProfile.allowedCategories.includes(String(trend.category || '').trim()))
    : persistedTrends;
  const pageStart = (requestedPage - 1) * requestedLimit;
  const finalTrends = filteredTrends.slice(pageStart, pageStart + requestedLimit);

  const items = await Promise.all(finalTrends.map(async (trend) => ({
    id: trend._id,
    _id: trend._id,
    title: trend.title,
    score: trend.score,
    source: trend.source,
    category: trend.category,
    credibilityScore: trend.credibilityScore || 0,
    credibilityConfidence: trend.credibilityConfidence || 'low',
    verificationStatus: trend.verificationStatus || 'unverified',
    isFakeNews: Boolean(trend.isFakeNews),
    popularity: trend.popularity || 0,
    growth: trend.growth || 0,
    image: trend.image || '',
    video: trend.video || '',
    thumbnail: trend.thumbnail || '',
    mediaType: trend.mediaType || 'none',
    link: trend.link || '',
    ml_prediction: await refreshRedditPrediction(trend),
    createdAt: trend.createdAt,
    savedCount: trend.savedCount || 0,
    isSaved: savedSet.has(String(trend._id))
  })));

  const response = {
    items,
    meta: {
      total: stored.meta?.total || filteredTrends.length,
      page: requestedPage,
      limit: requestedLimit,
      totalPages: Math.max(1, Math.ceil(Number(stored.meta?.total || filteredTrends.length) / requestedLimit)),
      hasMore: requestedPage < Math.max(1, Math.ceil(Number(stored.meta?.total || filteredTrends.length) / requestedLimit)),
      personalized: personalizationProfile.personalized,
      activePreferences: personalizationProfile.activePreferences
    },
    user: {
      aiRemaining: user?.aiRemaining ?? 0
    }
  };

  res.status(200).json(response);
});

const searchTrends = asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = clampSearchLimit(req.query.limit);
  const mongoQuery = buildTrendSearchQuery(query);

  if (!mongoQuery) {
    return res.status(200).json({
      items: [],
      meta: {
        query,
        total: 0,
        limit
      }
    });
  }

  const trends = await Trend.find(mongoQuery)
    .select('title source category score image video thumbnail mediaType link tags excerpt createdAt savedCount ml_prediction credibilityScore credibilityConfidence verificationStatus isFakeNews')
    .sort({ score: -1, createdAt: -1 })
    .limit(SEARCH_SCAN_LIMIT)
    .lean();

  const savedSet = new Set((req.user?.savedTrends || []).map(String));
  const ranked = trends
    .map((trend) => ({
      ...trend,
      searchRelevance: calculateSearchRelevance(trend, query)
    }))
    .filter((trend) => trend.searchRelevance > 0)
    .sort((a, b) => {
      if (b.searchRelevance !== a.searchRelevance) return b.searchRelevance - a.searchRelevance;
      return Number(b.score || 0) - Number(a.score || 0);
    });

  const items = ranked.slice(0, limit).map((trend) => ({
    id: trend._id,
    _id: trend._id,
    title: trend.title,
    score: trend.score,
    source: trend.source,
    category: trend.category,
    image: trend.image || '',
    video: trend.video || '',
    thumbnail: trend.thumbnail || '',
    mediaType: trend.mediaType || 'none',
    link: trend.link || '',
    tags: Array.isArray(trend.tags) ? trend.tags : [],
    credibilityScore: trend.credibilityScore || 0,
    credibilityConfidence: trend.credibilityConfidence || 'low',
    verificationStatus: trend.verificationStatus || 'unverified',
    isFakeNews: Boolean(trend.isFakeNews),
    ml_prediction: safePredictionValue(trend.ml_prediction),
    createdAt: trend.createdAt,
    savedCount: trend.savedCount || 0,
    isSaved: savedSet.has(String(trend._id))
  }));

  res.status(200).json({
    items,
    meta: {
      query,
      total: ranked.length,
      limit,
      searchedFields: ['title', 'tags', 'category', 'excerpt', 'link']
    }
  });
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
    ml_prediction: safePredictionValue(trend.ml_prediction),
    score: trend.score || 0,
    scoreDetails: trend.scoreDetails || {},
    credibilityScore: trend.credibilityScore || 0,
    credibilityConfidence: trend.credibilityConfidence || 'low',
    verificationStatus: trend.verificationStatus || 'unverified',
    verifiedSources: Array.isArray(trend.verifiedSources) ? trend.verifiedSources : [],
    credibilityExplanation: trend.credibilityExplanation || '',
    isFakeNews: Boolean(trend.isFakeNews),
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

  if (reservedQuota && analysis?.status !== 'groq') {
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
      analysis: analysis?.summary || '',
      idea: analysis?.opportunity || '',
      link: trend.link || '',
      image: trend.image || '',
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
      ml_prediction: safePredictionValue(trend.ml_prediction)
    },
    analysis: {
      ...analysis,
      status: analysis?.status || 'groq'
    },
    aiRemaining: req.user?.aiRemaining ?? 0
  });
});

module.exports = {
  getFeed,
  searchTrends,
  getTrendDetail,
  analyzeTrend,
  buildTrendSearchQuery,
  calculateSearchRelevance
};
