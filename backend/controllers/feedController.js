const asyncHandler = require("../middleware/asyncHandler");
const { getRealTrends } = require("../services/data");
const { generateBatchAnalysis } = require("../services/aiService");

const getFeed = asyncHandler(async (req, res, next) => {
  const user = req.user;

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

  let filteredTrends = trends;
  if (user?.preferences?.length > 0) {
    filteredTrends = trends.filter((trend) =>
      user.preferences.some((pref) =>
        trend.title.toLowerCase().includes(pref.toLowerCase())
      )
    );
  }

  const finalTrends = filteredTrends.length > 0 ? filteredTrends : trends;

  const feed = finalTrends.map((trend, index) => ({
    id: index + 1,
    title: trend.title,
    score: trend.score,
    analysis: trend.analysis,
    idea: trend.idea,
    source: trend.source,
    link: trend.link || "",
    createdAt: new Date()
  }));

  res.status(200).json(feed);
});

module.exports = { getFeed };