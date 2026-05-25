require("dotenv").config();

const axios = require("axios");

const {
  cleanTitle,
  validateTrend,
  estimateSentimentScore,
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
      .map((trend) => {
        if (!trend || !trend.query) return null;

        const title = cleanTitle(trend.query);
        if (!title) return null;

        const parseNumber = (value) => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const digits = value.replace(/[^\d.-]/g, '');
            return digits ? Number(digits) : 0;
          }
          return 0;
        };

        const searchVolume = parseNumber(trend.value || trend.formatted_value || trend.traffic || trend.search_volume);
        const deltaValue = trend.delta ? parseNumber(trend.delta.value || trend.delta || trend.delta_percentage || trend.delta_percentage_str) : 0;

        const popularity = searchVolume;
        const growth = deltaValue;
        const sentiment = estimateSentimentScore(trend.query);

        const data = {
          title,
          popularity,
          growth,
          source: "google",
          link: "",
          num_comments: 0,
          post_length: title.length,
          hour: new Date().getUTCHours(),
          title_length: title.length,
          sentiment,
          searchVolume,
          deltaValue,
        };

        return validateTrend(data) ? data : null;
      })
      .filter(Boolean)
      .slice(0, 10);

  } catch (error) {
    console.error("Google Trends error:", error.message);
    return [];
  }
};

module.exports = { getGoogleTrends };

