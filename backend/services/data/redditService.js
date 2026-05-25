const axios = require("axios");
const {
  cleanTitle,
  isGoodContent,
  validateTrend,
  estimateSentimentScore,
} = require("./cleaner");

const getRedditTrends = async () => {
  const urls = [
    "https://www.reddit.com/r/artificial.json?limit=20",
    "https://www.reddit.com/r/startups.json?limit=20",
    "https://www.reddit.com/r/Entrepreneur.json?limit=20",
    "https://www.reddit.com/r/technology.json?limit=20",
    "https://www.reddit.com/r/sports.json?limit=20",
    "https://www.reddit.com/r/worldnews.json?limit=20",
    "https://www.reddit.com/r/gaming.json?limit=20",
  ];

  let allPosts = [];
  let failedSources = 0;

  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 5000 });
      allPosts = allPosts.concat(res.data.data.children || []);
    } catch (err) {
      failedSources += 1;
      console.warn(`[Reddit] source failed: ${url} - ${err.message}`);
    }
  }

  if (allPosts.length === 0) {
    const error = new Error("No Reddit posts available");
    error.statusCode = 502;
    throw error;
  }

  const getScore = (t) => t.popularity * 0.7 + t.growth * 0.3;

  const trends = allPosts
    .map((post) => {
      if (!post || !post.data) return null;

      const title = cleanTitle(post.data.title);
      if (!title || title.length < 15) return null;
      if (!isGoodContent(title)) return null;

      const createdUtc = post.data.created_utc;
      const rawText = (post.data.selftext || "").trim();
      const postLength = rawText.length > 0 ? rawText.length : title.length;
      const sentiment = estimateSentimentScore(post.data.title);

      const trend = {
        title,
        popularity: post.data.score || 0,
        growth: post.data.num_comments || 0,
        source: "reddit",
        link: `https://reddit.com${post.data.permalink}`,
        num_comments: post.data.num_comments || 0,
        post_length: postLength,
        hour: createdUtc ? new Date(createdUtc * 1000).getUTCHours() : new Date().getUTCHours(),
        title_length: title.length,
        sentiment,
      };

      return validateTrend(trend) ? trend : null;
    })
    .filter(Boolean)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 10);

  return trends;
};

module.exports = { getRedditTrends };