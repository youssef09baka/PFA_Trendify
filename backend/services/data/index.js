const { getRedditTrends } = require("./redditService");
const { getGoogleTrends } = require("./googleTrendsService");

let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 60 * 1000;
const MAX_TRENDS = 40;

const normalizeTitleKey = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|of|in|on|for|and|to|from|with|via)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const interleaveSourceBuckets = (buckets, limit) => {
  const seen = new Set();
  const queues = buckets.map((bucket) => Array.isArray(bucket.trends) ? [...bucket.trends] : []);
  const output = [];

  while (output.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (output.length >= limit) break;
      const item = queue.shift();
      if (!item || !item.title) continue;
      const key = normalizeTitleKey(item.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      output.push(item);
    }
  }

  return output;
};

const buildSourceBuckets = async () => {
  const sources = [
    { name: 'Google Trends', fetcher: getGoogleTrends },
    { name: 'Reddit', fetcher: getRedditTrends }
  ];

  const results = await Promise.allSettled(
    sources.map(({ name, fetcher }) =>
      fetcher()
        .then((trends) => ({ name, trends: Array.isArray(trends) ? trends : [] }))
        .catch((error) => {
          console.warn(`[DATA] ${name} failed: ${error.message}`);
          return { name, trends: [] };
        })
    )
  );

  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => ({ name: result.value.name, trends: result.value.trends || [] }))
    .filter((bucket) => bucket.trends.length > 0);
};

const getRealTrends = async () => {
  if (cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
    console.info('[DATA] using cache');
    return cache.data;
  }

  const sourceBuckets = await buildSourceBuckets();
  if (sourceBuckets.length === 0) {
    const error = new Error('No trend data available from external sources');
    error.statusCode = 503;
    throw error;
  }

  const trends = interleaveSourceBuckets(sourceBuckets, MAX_TRENDS);
  if (trends.length === 0) {
    const error = new Error('No valid trend items available after source merging');
    error.statusCode = 503;
    throw error;
  }

  console.info(`[DATA] trends fetched: ${trends.length} from ${sourceBuckets.length} sources`);

  cache = {
    data: trends,
    timestamp: Date.now()
  };

  return trends;
};

module.exports = { getRealTrends };
