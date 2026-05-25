const Trend = require("../models/Trend");

const slugifyTitle = (title) =>
  title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const buildSlug = (trend) => {
  const source = (trend.source || "general").toString().toLowerCase().trim();
  const titleSlug = slugifyTitle(trend.title || "trend");
  return `${source}-${titleSlug}`;
};

const saveTrends = async (trends) => {
  const ops = trends.map(async (trend) => {
    const slug = trend.slug || buildSlug(trend);
    const update = {
      title: trend.title,
      source: trend.source || "unknown",
      category: trend.category || trend.source || "General",
      score: typeof trend.score === "number" ? trend.score : 0,
      scoreDetails: trend.scoreDetails || {
        popularity: trend.popularity || 0,
        growth: trend.growth || 0,
        formula: "0.7 * popularity + 0.3 * growth"
      },
      analysis: trend.analysis || "",
      idea: trend.idea || "",
      ml_prediction: trend.ml_prediction || "UNKNOWN",
      popularity: trend.popularity || 0,
      growth: trend.growth || 0,
      image: trend.image || "",
      video: trend.video || "",
      link: trend.link || "",
      fetchedAt: trend.fetchedAt || new Date(),
      tags: Array.isArray(trend.tags) ? trend.tags : [],
      slug
    };

    return Trend.findOneAndUpdate(
      { slug },
      { $set: update, $setOnInsert: { savedCount: 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  });

  return Promise.all(ops);
};

const getFeedTrends = async ({ limit = 12, category, source } = {}) => {
  const query = {};
  if (category) query.category = category;
  if (source) query.source = source;

  return Trend.find(query)
    .sort({ score: -1, updatedAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  saveTrends,
  getFeedTrends,
  buildSlug
};
