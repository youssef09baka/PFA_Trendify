const Trend = require("../models/Trend");
const { extractMediaForTrend } = require('./data/mediaExtractor');

const slugifyTitle = (title) =>
  title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const buildSlug = (trend) => {
  const source = (trend.source || "general").toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const titleSlug = slugifyTitle(trend.title || "trend");
  return `${source}-${titleSlug}`.replace(/-+/g, '-');
};

const CATEGORY_KEYWORDS = [
  { category: 'AI', terms: ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'llm', 'machine learning', 'neural', 'automation', 'robot', 'gpt'] },
  { category: 'Startups', terms: ['startup', 'founder', 'launch', 'incubator', 'accelerator', 'scaleup', 'seed', 'unicorn'] },
  { category: 'Tech', terms: ['tech', 'software', 'hardware', 'cloud', 'chip', 'device', 'platform', 'developer', 'cyber'] },
  { category: 'Gaming', terms: ['game', 'gaming', 'esport', 'playstation', 'xbox', 'nintendo', 'twitch', 'fortnite', 'league of legends', 'mario'] },
  { category: 'Business', terms: ['business', 'deal', 'strategy', 'market', 'growth', 'revenue'] },
  { category: 'Finance', terms: ['finance', 'stock', 'crypto', 'investment', 'economy', 'bank', 'earnings', 'funding', 'bitcoin', 'ethereum'] },
  { category: 'Social', terms: ['social media', 'instagram', 'facebook', 'twitter', 'tiktok', 'viral', 'influencer', 'community', 'post', 'reel'] },
  { category: 'Science', terms: ['science', 'research', 'study', 'space', 'biology', 'climate', 'health', 'physics', 'medicine', 'genetics'] },
  { category: 'Entertainment', terms: ['movie', 'music', 'tv', 'film', 'celebrity', 'show', 'festival', 'entertainment', 'concert', 'series'] },
  { category: 'Web culture', terms: ['meme', 'viral', 'trend', 'internet', 'community', 'subculture', 'web3', 'digital culture', 'meta', 'hype'] }
];

const normalizeSource = (source) => {
  const key = String(source || '').toLowerCase();
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google Trends';
  if (key.includes('youtube')) return 'YouTube';
  if (key.includes('twitter')) return 'Twitter';
  if (key.includes('tiktok')) return 'TikTok';
  if (!key) return 'General';
  return String(source).trim().replace(/\b\w/g, (char) => char.toUpperCase());
};

const inferCategory = (title, source) => {
  const lower = String(title || '').toLowerCase();
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.terms.some((term) => lower.includes(term))) {
      return rule.category;
    }
  }

  if (source === 'Reddit') return 'Discussion';
  if (source === 'Google Trends') return 'Search Trends';
  if (source === 'YouTube') return 'Video';
  if (source === 'Twitter' || source === 'TikTok') return 'Social';
  return 'General';
};

const normalizeCategory = (trend) => {
  if (trend.category && typeof trend.category === 'string' && trend.category.trim()) {
    return trend.category.trim().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return inferCategory(trend.title, trend.source);
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const getSourceConfidence = (source) => {
  const key = String(source || '').toLowerCase();
  if (key.includes('reddit')) return 0.9;
  if (key.includes('google')) return 0.85;
  if (key.includes('youtube')) return 0.8;
  if (key.includes('twitter')) return 0.78;
  if (key.includes('tiktok')) return 0.75;
  return 0.7;
};

const getRecencyFactor = (trend) => {
  if (trend.fetchedAt) {
    const ageHours = Math.abs(new Date() - new Date(trend.fetchedAt)) / 1000 / 3600;
    return clamp(1 - ageHours / 24, 0, 1);
  }
  if (typeof trend.hour === 'number' && trend.hour >= 0 && trend.hour <= 23) {
    const nowHour = new Date().getUTCHours();
    const diff = Math.min(Math.abs(nowHour - trend.hour), 24 - Math.abs(nowHour - trend.hour));
    return clamp(1 - diff / 12, 0, 1);
  }
  return 0.75;
};

const normalizeScore = (value, max) => {
  if (max <= 0) return 0;
  return clamp(value / max, 0, 1);
};

const computeMaxValues = (trends) => {
  const maxValues = { popularity: 1, growth: 1, engagement: 1 };
  trends.forEach((trend) => {
    maxValues.popularity = Math.max(maxValues.popularity, Math.max(0, trend.popularity || 0));
    maxValues.growth = Math.max(maxValues.growth, Math.max(0, trend.growth || 0));
    const engagement = Math.max(0, trend.num_comments || trend.searchVolume || trend.post_length || 0);
    maxValues.engagement = Math.max(maxValues.engagement, engagement);
  });
  return maxValues;
};

const buildScoreDetails = (trend, maxValues, categoryShare, sourceShare) => {
  const popularity = Math.max(0, trend.popularity || 0);
  const growth = Math.max(0, trend.growth || 0);
  const engagement = Math.max(0, trend.num_comments || trend.searchVolume || trend.post_length || 0);
  const sentiment = typeof trend.sentiment === 'number' ? trend.sentiment : 0;
  const recency = getRecencyFactor(trend);
  const sourceConfidence = getSourceConfidence(trend.source);

  const popularityFactor = normalizeScore(popularity, maxValues.popularity);
  const growthFactor = normalizeScore(growth, maxValues.growth);
  const engagementFactor = normalizeScore(engagement, maxValues.engagement);
  const sentimentFactor = clamp((sentiment + 1) / 2, 0, 1);
  const categoryBalance = clamp(1 - categoryShare, 0, 1);
  const sourceBalance = clamp(1 - sourceShare, 0, 1);

  const baseScore =
    22 +
    popularityFactor * 32 +
    growthFactor * 20 +
    engagementFactor * 10 +
    recency * 8 +
    sourceConfidence * 5;

  const diversityBonus = clamp((categoryBalance * 0.6 + sourceBalance * 0.4) * 10, 0, 10);
  const score = Math.round(clamp(baseScore + diversityBonus, 0, 100));

  return {
    score,
    scoreDetails: {
      popularity,
      growth,
      engagement,
      sentiment,
      recency: Number(recency.toFixed(3)),
      sourceConfidence: Number(sourceConfidence.toFixed(3)),
      popularityFactor: Number(popularityFactor.toFixed(3)),
      growthFactor: Number(growthFactor.toFixed(3)),
      engagementFactor: Number(engagementFactor.toFixed(3)),
      categoryBalance: Number(categoryBalance.toFixed(3)),
      sourceBalance: Number(sourceBalance.toFixed(3)),
      formula: '22 + 32*popularity + 20*growth + 10*engagement + 8*recency + 5*confidence + diversity bonus',
      summary: 'Score de 0-100 basé sur la traction, la fraîcheur, la confiance de source et l’équilibre de découverte.'
    }
  };
};

const scoreTrends = (trends = []) => {
  const maxValues = computeMaxValues(trends);
  const normalizedTrends = trends.map((trend) => {
    const source = normalizeSource(trend.source);
    const category = normalizeCategory({ ...trend, source });
    return {
      ...trend,
      source,
      category
    };
  });

  const categoryCounts = normalizedTrends.reduce((acc, trend) => {
    acc[trend.category] = (acc[trend.category] || 0) + 1;
    return acc;
  }, {});

  const sourceCounts = normalizedTrends.reduce((acc, trend) => {
    acc[trend.source] = (acc[trend.source] || 0) + 1;
    return acc;
  }, {});

  const total = Math.max(normalizedTrends.length, 1);

  return normalizedTrends.map((trend) => {
    const categoryShare = categoryCounts[trend.category] / total;
    const sourceShare = sourceCounts[trend.source] / total;
    const { score, scoreDetails } = buildScoreDetails({ ...trend }, maxValues, categoryShare, sourceShare);

    return {
      ...trend,
      score,
      scoreDetails,
      fetchedAt: trend.fetchedAt || new Date()
    };
  });
};

const saveTrends = async (trends) => {
  const ops = trends.map(async (trend) => {
    const normalizedSource = normalizeSource(trend.source);
    const normalizedCategory = normalizeCategory({ ...trend, source: normalizedSource });
    const slug = trend.slug || buildSlug({ ...trend, source: normalizedSource, category: normalizedCategory });

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
      source: normalizedSource,
      category: normalizedCategory,
      score: typeof trend.score === 'number' ? trend.score : 0,
      scoreDetails: trend.scoreDetails || {
        popularity: trend.popularity || 0,
        growth: trend.growth || 0,
        formula: '0.7 * popularity + 0.3 * growth'
      },
      analysis: trend.analysis || '',
      idea: trend.idea || '',
      ml_prediction: trend.ml_prediction || 'UNKNOWN',
      popularity: trend.popularity || 0,
      growth: trend.growth || 0,
      image: trend.image || '',
      video: trend.video || '',
      thumbnail: trend.thumbnail || '',
      mediaType: trend.mediaType || 'none',
      link: trend.link || '',
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
  scoreTrends,
  getFeedTrends,
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
