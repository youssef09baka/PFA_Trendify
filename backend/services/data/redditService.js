const axios = require("axios");
const {
  cleanTitle,
  isGoodContent,
  validateTrend,
} = require("./cleaner");

const getRedditTrends = async () => {
  try {
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

    for (const url of urls) {
      const res = await axios.get(url, { timeout: 5000 });
      allPosts = allPosts.concat(res.data.data.children);
    }

    const getScore = (t) => t.popularity * 0.7 + t.growth * 0.3;

    const trends = allPosts
      .map((post) => {

        if (!post || !post.data) return null;

        let title = cleanTitle(post.data.title);

        if (!title || title.length < 15) return null;

        if (!isGoodContent(title)) return null;

        const trend = {
          title,
          popularity: post.data.score || 0,
          growth: post.data.num_comments || 0,
          source: "reddit",
          link: `https://reddit.com${post.data.permalink}`,
        };

        return validateTrend(trend) ? trend : null;
      })
      .filter(Boolean)
      .sort((a, b) => getScore(b) - getScore(a))
      .slice(0, 10);

    return trends;

  } catch (err) {
    console.error("Reddit error:", err.message);
    return [];
  }
};

module.exports = { getRedditTrends };