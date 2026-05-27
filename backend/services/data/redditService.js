const axios = require("axios");
const {
  cleanTitle,
  isGoodContent,
  validateTrend,
  estimateSentimentScore,
} = require("./cleaner");

const { extractFromReddit } = require('./mediaExtractor');

const SUBREDDITS = [
  'artificial',
  'technology',
  'Entrepreneur',
  'startups',
  'business',
  'science',
  'gaming',
  'worldnews',
  'Futurology',
  'FinancialIndependence',
  'datascience',
  'marketing',
  'entertainment',
  'CryptoCurrency'
];

const normalizeTitleKey = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getRedditTrends = async () => {
  const urls = SUBREDDITS.map((subreddit) => `https://www.reddit.com/r/${subreddit}.json?limit=20`);
  let allPosts = [];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 5000 });
      allPosts = allPosts.concat(res.data.data.children || []);
    } catch (err) {
      console.warn(`[Reddit] source failed: ${url} - ${err.message}`);
    }
  }

  if (allPosts.length === 0) {
    const error = new Error("No Reddit posts available");
    error.statusCode = 502;
    throw error;
  }

  const getScore = (t) => (t.popularity * 0.65) + (t.growth * 0.25) + (t.num_comments * 0.1);

  const seenTitles = new Set();
  const trends = allPosts
    .map((post) => {
      if (!post || !post.data) return null;

      const title = cleanTitle(post.data.title);
      if (!title || title.length < 12) return null;
      if (!isGoodContent(title)) return null;

      const titleKey = normalizeTitleKey(title);
      if (!titleKey || seenTitles.has(titleKey)) return null;
      seenTitles.add(titleKey);

      const createdUtc = post.data.created_utc;
      const rawText = (post.data.selftext || "").trim();
      const postLength = rawText.length > 0 ? rawText.length : title.length;
      const sentiment = estimateSentimentScore(post.data.title);
      const mediaInfo = extractFromReddit(post.data);

      const trend = {
        title,
        popularity: post.data.score || 0,
        growth: post.data.num_comments || 0,
        source: "reddit",
        link: `https://reddit.com${post.data.permalink}`,
        image: mediaInfo.image || '',
        video: mediaInfo.video || '',
        thumbnail: mediaInfo.thumbnail || '',
        mediaType: mediaInfo.mediaType || 'none',
        fetchedAt: new Date(),
        _raw: post.data,
        num_comments: post.data.num_comments || 0,
        post_length: postLength,
        hour: createdUtc ? new Date(createdUtc * 1000).getUTCHours() : new Date().getUTCHours(),
        title_length: title.length,
        sentiment,
        tags: [post.data.subreddit, post.data.link_flair_text].filter(Boolean)
      };

      return validateTrend(trend) ? trend : null;
    })
    .filter(Boolean)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 20);

  return trends;
};

module.exports = { getRedditTrends };