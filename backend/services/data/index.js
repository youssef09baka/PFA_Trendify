const { getRedditTrends } = require("./redditService");
const { getGoogleTrends } = require("./googleTrendsService");

// 🔥 cache simple
let cache = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 60 * 1000;

const getRealTrends = async () => {
  try {

    if (
      cache.data &&
      Date.now() - cache.timestamp < CACHE_DURATION
    ) {
      console.log("DATA: using cache");
      return cache.data;
    }

    let reddit = [];
    let google = [];

    try {
      reddit = await getRedditTrends();
    } catch (err) {
      console.error("Reddit failed:", err.message);
    }

    try {
      google = await getGoogleTrends();
    } catch (err) {
      console.error("Google failed:", err.message);
    }

    if (!Array.isArray(reddit)) reddit = [];
    if (!Array.isArray(google)) google = [];

    // 🔥 fusion globale
    let trends = [...reddit, ...google];

    // 🔥 fallback
    if (trends.length === 0) {

      console.warn(
        "DATA: no trends found"
      );

      return [
        {
          title: "Trending world topics",
          popularity: 50,
          growth: 10,
          source: "fallback",
          link: "",
        },
      ];
    }

    trends = trends.slice(0, 20);

    console.log(
      "DATA: trends fetched:",
      trends.length
    );

    cache = {
      data: trends,
      timestamp: Date.now(),
    };

    return trends;

  } catch (error) {

    console.error(
      "DATA ERROR:",
      error.message
    );

    return [
      {
        title: "Global trends",
        popularity: 40,
        growth: 5,
        source: "fallback",
        link: "",
      },
    ];
  }
};

module.exports = { getRealTrends };