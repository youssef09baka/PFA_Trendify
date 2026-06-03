// Reddit ingestion now prefers OAuth API. If OAuth credentials are missing, the service falls back to the RSS parser.
const { REDDIT_FETCH_LIMIT } = require("../../config/config");
const { fetchRedditPosts } = require("./redditApi");
const {
  cleanTitle,
  isGoodContent,
  validateTrend,
  estimateSentimentScore
} = require("./cleaner");
const { generateMlFeatures } = require("../featureGenerator");

const { extractFromReddit } = require('./mediaExtractor');
const { SUBREDDITS } = require('./redditSubreddits');

const SUBREDDIT_LIST = SUBREDDITS;

const normalizeTitleKey = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getRedditTrends = async () => {
  const limit = Math.max(40, Number(REDDIT_FETCH_LIMIT || 75));
  let allPosts = [];

  for (const subreddit of SUBREDDIT_LIST) {
    try {
      const posts = await fetchRedditPosts(subreddit, limit);
      allPosts = allPosts.concat(posts || []);
      console.info(`[Reddit] collected ${posts?.length || 0} posts from r/${subreddit}`);
    } catch (err) {
      console.warn(`[Reddit] source failed for r/${subreddit}: ${err.message}`);
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

      const excerpt = rawText ? rawText.slice(0, 220).trim() : title;
      const trend = {
        title,
        popularity: post.data.score || 0,
        growth: post.data.num_comments || 0,
        source: "Reddit",
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
        tags: [post.data.subreddit, post.data.link_flair_text].filter(Boolean),
        excerpt,
        source_detail: post.data.subreddit
      };

      const enrichedTrend = generateMlFeatures(trend);
      return validateTrend(enrichedTrend) ? enrichedTrend : null;
    })
    .filter(Boolean)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, Math.max(150, Number(REDDIT_FETCH_LIMIT || 75) * 2));

  return trends;
};

module.exports = { getRedditTrends };