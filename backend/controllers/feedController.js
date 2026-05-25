const asyncHandler = require("../middleware/asyncHandler");
const { getRealTrends } = require("../services/data");
const { generateBatchAnalysis } = require("../services/aiService");
const { predictTrend } = require("../services/mlService");
const { saveTrends, getFeedTrends } = require("../services/trendService");

const getFeed = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // Serve persisted trends by default. Pass ?refresh=true to force live fetch.
  const forceRefresh = String(req.query.refresh || "false").toLowerCase() === "true";
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 12;
  const sort = req.query.sort || 'score';
  const category = req.query.category || undefined;
  const source = req.query.source || undefined;
  const viral = req.query.viral === 'true' || req.query.viral === '1';

  const stored = await getFeedTrends({ page, limit, category, source, sort, viral });
  const storedTrends = stored.data || [];
  const savedSet = new Set((user?.savedTrends || []).map(String));

  if (storedTrends && storedTrends.length > 0 && !forceRefresh) {
    return res.status(200).json({
      items: storedTrends.map((trend) => ({
        id: trend._id,
        title: trend.title,
        score: trend.score,
        source: trend.source,
        category: trend.category,
        image: trend.image,
        video: trend.video,
        thumbnail: trend.thumbnail || '',
        mediaType: trend.mediaType || 'none',
        shortAnalysis: trend.analysis ? (trend.analysis.length > 240 ? trend.analysis.slice(0, 237) + '...' : trend.analysis) : '',
        ml_prediction: trend.ml_prediction,
        createdAt: trend.createdAt,
        savedCount: trend.savedCount || 0,
        isSaved: savedSet.has(String(trend._id))
      })),
      meta: stored.meta || { total: storedTrends.length, page, limit, totalPages: 1, hasMore: false }
    });
  }

  // If DB empty or forceRefresh, run live fetch once and persist results.
  const rawTrends = await getRealTrends();
  if (!Array.isArray(rawTrends) || rawTrends.length === 0) {
    const error = new Error("No feed data available");
    error.statusCode = 503;
    return next(error);
  }

  const trendsWithScore = rawTrends.map((trend) => ({
    ...trend,
    score: typeof trend.score === "number"
      ? trend.score
      : Math.round((Math.max(trend.popularity || 0, 0) * 0.7) + (Math.max(trend.growth || 0, 0) * 0.3))
  }));

  const trends = await generateBatchAnalysis(trendsWithScore.slice(0, 12));

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
      title: trend.title,
      score: trend.score,
      source: trend.source,
      category: trend.category,
      image: trend.image,
      video: trend.video,
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
      shortAnalysis: trend.analysis ? (trend.analysis.length > 240 ? trend.analysis.slice(0, 237) + '...' : trend.analysis) : '',
      ml_prediction: trend.ml_prediction,
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
    }
  };

  res.status(200).json(response);
});

module.exports = { getFeed };