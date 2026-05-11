require("dotenv").config();
const axios = require("axios");
const {
  cleanTitle,
  isRelevant,
  validateTrend,
} = require("./cleaner");

const API_KEY = process.env.SERPAPI_KEY;

const getGoogleTrends = async () => {
  try {
    const response = await axios.get(
      "https://serpapi.com/search.json",
      {
        params: {
          engine: "google_trends_trending_now",
          geo: "US",
          api_key: API_KEY,
        },
        timeout: 5000,
      }
    );

    const raw = response.data.trending_searches || [];

    return raw
      .map((trend, index) => {
        // 🔥 sécurité
        if (!trend || !trend.query) return null;

        let title = cleanTitle(trend.query);
        if (!title) return null;

        if (!isRelevant(title)) return null;

        // 🔥 score sécurisé (jamais négatif)
        const popularity = Math.max(10000 - index * 500, 100);
        const growth = Math.max(50 - index, 5);

        const data = {
          title,
          popularity,
          growth,
          source: "google",
          link: "",
        };

        return validateTrend(data) ? data : null;
      })
      .filter(Boolean)
      .slice(0, 5);
  } catch (error) {
    console.error("Google Trends error:", error.message);
    return [];
  }
};

module.exports = { getGoogleTrends };

