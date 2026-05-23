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
    trends = trends.slice(0, 5);

    // 🔥 6. scoring UNIFIÉ (propre)
    trends = trends.map(trend => ({
      ...trend,
      score: Math.round(trend.popularity * 0.7 + trend.growth * 0.3)
    }));

    // 🔥 7. tri
    trends.sort((a, b) => b.score - a.score);
        // 🔥 8. ML Prediction
    for (const trend of trends) {

      try {

        const mlResponse = await axios.post(
          "http://127.0.0.1:5000/predict",
          {
            reddit_score: trend.popularity,
            comments_count: Math.floor(trend.popularity / 10),
            google_trend_score: trend.growth,
            engagement_rate: trend.popularity / 100,
            growth_rate: trend.growth,
            sentiment_score: 0.5
          }
        );

        // ajouter prédiction ML
        trend.ml_prediction = mlResponse.data.prediction;

      } catch (mlError) {

        console.error("ML ERROR:", mlError.message);

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