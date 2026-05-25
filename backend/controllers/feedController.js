const asyncHandler = require("../middleware/asyncHandler");
const { getRealTrends } = require("../services/data");
const { generateBatchAnalysis } = require("../services/aiService");
const { predictTrend } = require("../services/mlService");
const { saveTrends, getFeedTrends } = require("../services/trendService");

const getFeed = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // Serve persisted trends by default. Pass ?refresh=true to force live fetch.
  const forceRefresh = String(req.query.refresh || "false").toLowerCase() === "true";
  const storedTrends = await getFeedTrends({ limit: 12 });

  if (storedTrends && storedTrends.length > 0 && !forceRefresh) {
    return res.status(200).json(storedTrends.map((trend) => ({
      id: trend._id,
      title: trend.title,
      source: trend.source,
      category: trend.category,
      score: trend.score,
      analysis: trend.analysis,
      idea: trend.idea,
      ml_prediction: trend.ml_prediction,
      link: trend.link,
      image: trend.image,
      createdAt: trend.createdAt
    })));
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

  const feed = finalTrends.map((trend) => ({
    id: trend._id,
    title: trend.title,
    score: trend.score,
    analysis: trend.analysis,
    idea: trend.idea,
    source: trend.source,
    link: trend.link || "",
    createdAt: trend.createdAt
  }));

  res.status(200).json(feed);
});

module.exports = { getFeed };