const axios = require("axios");
const { generateBatchAnalysis } = require("../services/aiService");
const { getRealTrends } = require("../services/data");

const getTrends = async (req, res) => {

  try {
    // 🔥 1. DATA RÉELLE
    let trends = await getRealTrends();

    // 🔥 2. sécurité format
    if (!Array.isArray(trends)) {
      console.warn("DATA: invalid format");
      trends = [];
    }

    // 🔥 3. fallback si vide
    if (trends.length === 0) {
      console.warn("DATA: empty, using fallback");
      trends = [
        {
          title: "AI tools for productivity",
          popularity: 50,
          growth: 10,
          source: "fallback",
          link: ""
        }
      ];
    }

    // 🔥 4. validation + nettoyage
    trends = trends
      .filter(t =>
        t &&
        typeof t.title === "string" &&
        typeof t.popularity === "number" &&
        typeof t.growth === "number"
      )
      .map(t => ({
        ...t,
        title: t.title.replace(/\s+/g, " ").trim() // clean titre
      }));

    // 🔥 5. limiter (perf IA)
    trends = trends.slice(0, 10);

    // 🔥 6. scoring normalisé et explicable
    const popularityValues = trends.map((trend) => Math.max(trend.popularity || 0, 0));
    const growthValues = trends.map((trend) => Math.max(trend.growth || 0, 0));

    const normalize = (values) => {
      const max = Math.max(...values, 0);
      return values.map((value) => (max > 0 ? value / max : 0));
    };

    const normalizedPopularity = normalize(popularityValues);
    const normalizedGrowth = normalize(growthValues);

    trends = trends.map((trend, index) => {
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
          explanation: "Le score combine la visibilité et l&#39;évolution relative de la tendance parmi les résultats actuels.",
        },
      };
    });

    // 🔥 7. tri
    trends.sort((a, b) => b.score - a.score);
        // 🔥 8. ML Prediction
    for (const trend of trends) {
      try {
        const modelInputReady = [
          "num_comments",
          "post_length",
          "hour",
          "title_length",
          "sentiment"
        ].every(field => typeof trend[field] === "number");

        if (!modelInputReady) {
          trend.ml_prediction = "UNAVAILABLE";
          continue;
        }

        const mlResponse = await axios.post(
          "http://127.0.0.1:5000/predict",
          {
            num_comments: trend.num_comments,
            post_length: trend.post_length,
            hour: trend.hour,
            title_length: trend.title_length,
            sentiment: trend.sentiment
          }
        );

        // ajouter prédiction ML
        trend.ml_prediction = mlResponse.data.prediction;

      } catch (mlError) {
        console.error("ML ERROR:", mlError.response?.data || mlError.message);
        trend.ml_prediction = "UNKNOWN";
      }
    }

    // 🔥 8. logs utiles (debug / soutenance)
    console.log("TRENDS COUNT:", trends.length);
    console.log("TOP TREND:", trends[0]?.title);

    // 🔥 9. IA (batch optimisé)
    trends = await generateBatchAnalysis(trends);

    // 🔥 10. réponse finale
    res.status(200).json(trends);

  } catch (error) {
    console.error("TRENDS ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getTrends,
};