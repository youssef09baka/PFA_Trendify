const { getRedditTrends } = require("./redditService");
const { getGoogleTrends } = require("./googleTrendsService");

let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 60 * 1000;

const getRealTrends = async () => {
  if (cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
    console.info("[DATA] using cache");
    return cache.data;
  }

  let reddit = [];
  let google = [];

  try {
    reddit = await getRedditTrends();
  } catch (err) {
    console.warn(`[DATA] Reddit failed: ${err.message}`);
  }

  try {
    google = await getGoogleTrends();
  } catch (err) {
    console.warn(`[DATA] Google failed: ${err.message}`);
  }

  if (!Array.isArray(reddit)) reddit = [];
  if (!Array.isArray(google)) google = [];

  const trends = [...reddit, ...google].filter(Boolean).slice(0, 20);

  if (trends.length === 0) {
    const error = new Error("No trend data available from external sources");
    error.statusCode = 503;
    throw error;
  }

  console.info(`[DATA] trends fetched: ${trends.length}`);

  cache = {
    data: trends,
    timestamp: Date.now()
  };

  return trends;
};

module.exports = { getRealTrends };
