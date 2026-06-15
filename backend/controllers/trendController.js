const asyncHandler = require("../middleware/asyncHandler");
const { generateBatchAnalysis } = require("../services/aiService");
const { getRealTrends } = require("../services/data");
const { predictTrend } = require("../services/mlService");

const getTrends = asyncHandler(async (req, res, next) => {
  const rawTrends = await getRealTrends();

  if (!Array.isArray(rawTrends)) {
    const error = new Error("Trend data format invalid");
    error.statusCode = 502;
    return next(error);
  }

  const trends = rawTrends
    .filter((t) =>
      t &&
      typeof t.title === "string" &&
      typeof t.popularity === "number" &&
      typeof t.growth === "number"
    )
    .map((t) => ({
      ...t,
      title: t.title.replace(/\s+/g, " ").trim()
    }))
    .slice(0, 10);

  const popularityValues = trends.map((trend) => Math.max(trend.popularity || 0, 0));
  const growthValues = trends.map((trend) => Math.max(trend.growth || 0, 0));

  const normalize = (values) => {
    const max = Math.max(...values, 0);
    return values.map((value) => (max > 0 ? value / max : 0));
  };

  const normalizedPopularity = normalize(popularityValues);
  const normalizedGrowth = normalize(growthValues);

  const scoredTrends = trends.map((trend, index) => {
    const popScore = normalizedPopularity[index];
    const growthScore = normalizedGrowth[index];
    const score = Math.round((popScore * 0.7 + growthScore * 0.3) * 100);

    return {
      ...trend,
      score,
      scoreDetails: {
        popularityRaw: trend.popularity,
        growthRaw: trend.growth,
        popularityNormalized: Number(popScore.toFixed(3)),
        growthNormalized: Number(growthScore.toFixed(3)),
        formula: "0.7 * popularity + 0.3 * growth (normalized)",
        explanation: "Le score combine la visibilité et l'évolution relative de la tendance parmi les résultats actuels."
      }
    };
  });

  scoredTrends.sort((a, b) => b.score - a.score);

  for (let i = 0; i < scoredTrends.length; i += 1) {
    // Apply ML prediction to ALL sources (not just Reddit)
    const mlPrediction = await predictTrend(scoredTrends[i]);
    
    // Store prediction details
    scoredTrends[i] = {
      ...scoredTrends[i],
      ml_prediction: mlPrediction.classification,
      ml_confidence: mlPrediction.confidence,
      ml_reasoning: mlPrediction.reasoning,
      ml_explanation: mlPrediction.explanation
    };
  }

  const enrichedTrends = await generateBatchAnalysis(scoredTrends);

  res.status(200).json(enrichedTrends);
});

module.exports = {
  getTrends
};