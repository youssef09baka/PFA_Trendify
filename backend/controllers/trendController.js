const axios = require("axios");
const asyncHandler = require("../middleware/asyncHandler");
const { generateBatchAnalysis } = require("../services/aiService");
const { getRealTrends } = require("../services/data");
const { ML_SERVICE_URL } = require("../config/config");

<<<<<<< HEAD
const getTrends = async (req, res) => {
  try {
    let trends = [
      {
        title: "AI tools for students",
        popularity: 85,
        growth: 20,
        source: "reddit"
      },
      {
        title: "Fitness at home",
        popularity: 70,
        growth: 15,
        source: "google trends"
      },
      {
        title: "Online business ideas 2026",
        popularity: 90,
        growth: 25,
        source: "youtube"
      },
      {
        title: "Work from home jobs",
        popularity: 83,
        growth: 22,
        source: "google Trends"
      }
    ];
=======
const getTrends = asyncHandler(async (req, res, next) => {
  const rawTrends = await getRealTrends();
>>>>>>> origin/main

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

  for (const trend of scoredTrends) {
    const modelInputReady = [
      "num_comments",
      "post_length",
      "hour",
      "title_length",
      "sentiment"
    ].every((field) => typeof trend[field] === "number");

    if (!modelInputReady) {
      trend.ml_prediction = "UNAVAILABLE";
      continue;
    }

<<<<<<< HEAD
    res.status(200).json(trends);

  } catch (error) {
    res.status(500).json({ message: error.message });
  } 
};
=======
    try {
      const mlResponse = await axios.post(
        ML_SERVICE_URL,
        {
          num_comments: trend.num_comments,
          post_length: trend.post_length,
          hour: trend.hour,
          title_length: trend.title_length,
          sentiment: trend.sentiment
        }
      );
      trend.ml_prediction = mlResponse.data.prediction;
    } catch (mlError) {
      console.warn(
        `[ML] prediction failed for "${trend.title}": ${mlError.response?.data || mlError.message}`
      );
      trend.ml_prediction = "UNKNOWN";
    }
  }
>>>>>>> origin/main

  const enrichedTrends = await generateBatchAnalysis(scoredTrends);

  res.status(200).json(enrichedTrends);
});

module.exports = {
  getTrends
};