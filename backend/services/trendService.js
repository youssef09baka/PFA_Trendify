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

const { extractMediaForTrend } = require('./data/mediaExtractor');

const saveTrends = async (trends) => {
  const ops = trends.map(async (trend) => {
    const slug = trend.slug || buildSlug(trend);
    // ensure media fields are present; attempt lightweight extraction if missing
    try {
      const needsMedia = !trend.image && !trend.thumbnail && !trend.video;
      if (needsMedia) {
        const m = await extractMediaForTrend(trend, trend._raw).catch(() => null);
        if (m) {
          trend.image = trend.image || m.image || '';
          trend.video = trend.video || m.video || '';
          trend.thumbnail = trend.thumbnail || m.thumbnail || '';
          trend.mediaType = trend.mediaType || (m.mediaType || 'none');
        }
      }
    } catch (e) {
      // ignore media extraction failures
    }

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
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
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

const getFeedTrends = async ({ page = 1, limit = 12, category, source, sort = 'score', viral } = {}) => {
  const query = {};
  if (category) query.category = category;
  if (source) query.source = source;
  if (viral) {
    query.$or = [
      { ml_prediction: 1 },
      { ml_prediction: '1' },
      { ml_prediction: 'viral' }
    ];
  }

  const skip = Math.max(0, (Number(page) - 1)) * Number(limit);

  // sorting options
  let sortOption = { score: -1, updatedAt: -1 };
  if (sort === 'newest') sortOption = { createdAt: -1 };
  else if (sort === 'trending') sortOption = { score: -1, fetchedAt: -1 };

  const [total, items] = await Promise.all([
    Trend.countDocuments(query),
    Trend.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean()
  ]);

  const totalPages = Math.max(1, Math.ceil(total / Number(limit)));

  return {
    data: items,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasMore: Number(page) < totalPages
    }
  };
};

module.exports = {
  saveTrends,
  getFeedTrends,
  // fetch single trend and related helpers
  getTrendById: async (id) => {
    if (!id) return null;
    return Trend.findById(id).lean();
  },
  getRelatedTrends: async (id, { category, tags, source, limit = 5 } = {}) => {
    const query = { _id: { $ne: id } };
    if (category) query.category = category;
    if (source) query.source = source;
    if (Array.isArray(tags) && tags.length > 0) query.tags = { $in: tags };

    return Trend.find(query).sort({ score: -1 }).limit(Number(limit)).lean();
  },
  buildSlug
};
