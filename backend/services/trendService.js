const logger = require('../utils/logger');
/**
 * Trend Service
 * Manages trend scoring, enrichment, media extraction, and database persistence.
 * Provides core functionality for trend retrieval, filtering, and related content discovery.
 */

const Trend = require("../models/Trend");
const { Types } = require('mongoose');
const { isPlaceholderMediaUrl } = require('./data/mediaExtractor');
const { computeMediaFingerprint } = require('./data/mediaUniqueness');
const { generateMlFeatures } = require("./featureGenerator");
const { predictTrend } = require("./mlService");
const { evaluateTrendCredibility } = require("./credibilityService");

const ALLOWED_PREDICTIONS = ['HIGH', 'LOW', 'UNAVAILABLE'];

const normalizeMlPrediction = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null) {
    if (typeof value.classification === 'string') return value.classification.trim().toUpperCase();
    if (typeof value.ml_prediction === 'string') return value.ml_prediction.trim().toUpperCase();
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === '1') return 'HIGH';
    if (normalized === '0') return 'LOW';
    return normalized;
  }
  return null;
};

const safeMlPredictionValue = (value) => {
  const normalized = normalizeMlPrediction(value);
  if (normalized === null) return 'UNAVAILABLE';
  if (!ALLOWED_PREDICTIONS.includes(normalized)) return 'UNAVAILABLE';
  return normalized;
};

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

const matchesCategoryTerm = (text, term) => {
  const normalizedTerm = String(term || '').toLowerCase().trim();
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(' ')) return text.includes(normalizedTerm);
  return new RegExp(`\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
};

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
    if (rule.terms.some((term) => matchesCategoryTerm(lower, term))) {
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
  const raw = Math.max(0, Number(value) || 0);
  const safeMax = Math.max(1, Number(max) || 1);
  return clamp(Math.log1p(raw) / Math.log1p(safeMax), 0, 1);
};

const getTrendAgeHours = (trend) => {
  const sourceTime = trend.fetchedAt || trend.createdAt || trend.updatedAt || trend.savedAt;
  if (!sourceTime) return 0;
  return Math.max(0, (Date.now() - new Date(sourceTime).getTime()) / (1000 * 60 * 60));
};

const computeFreshnessBoost = (trend) => {
  const ageHours = getTrendAgeHours(trend);
  return clamp(6 - ageHours * 0.18, 0, 5.5);
};

const computeSeenBoost = (trend, seenIds = []) => {
  const key = String(trend._id || trend.id || trend.slug || trend.title || '');
  return seenIds.includes(key) ? 0 : 1.8;
};

const computeRandomFactor = (trend, seed = 0) => {
  const text = String(trend.title || trend.slug || '').toLowerCase();
  const hash = [...text].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const wave = Math.sin((hash + seed * 17.19) * 0.61803398875) * 0.28;
  return Number((wave + (seed % 0.2) * 0.1).toFixed(3));
};

const computeCategoryDiversityBoost = (trend, previousTrend) => {
  const sameCategory = String(trend.category || '').toLowerCase() === String(previousTrend?.category || '').toLowerCase();
  return sameCategory ? -0.06 : 0.02;
};

const mixFeedItems = (items = [], options = {}) => {
  const seenIds = Array.isArray(options.seenIds) ? options.seenIds.map(String) : [];
  const seed = Number(options.seed ?? Math.random()) || Math.random();
  const ranked = (items || [])
    .map((trend, index) => {
      const freshnessBoost = computeFreshnessBoost(trend);
      const unseenBoost = computeSeenBoost(trend, seenIds);
      const randomFactor = computeRandomFactor(trend, seed + index * 0.013);
      const categoryBoost = index > 0 ? computeCategoryDiversityBoost(trend, items[index - 1]) : 0;
      const finalScore = Number(trend.score || 0) + freshnessBoost + unseenBoost + randomFactor + categoryBoost;

      return {
        ...trend,
        freshnessBoost,
        unseenBoost,
        randomFactor,
        categoryBoost,
        finalScore,
        mixedScore: Number(finalScore.toFixed(3))
      };
    });

  const before = ranked.map((entry) => ({ id: entry._id || entry.id || entry.slug, score: entry.score, mixedScore: entry.mixedScore }));
  const mixed = ranked
    .sort((a, b) => b.mixedScore - a.mixedScore || Number(b.score || 0) - Number(a.score || 0));

  logger.info('[FEED-MIX] ranking', {
    runtimeSeed: Number(seed.toFixed(4)),
    before,
    after: mixed.slice(0, 8).map((entry) => ({ id: entry._id || entry.id || entry.slug, score: entry.score, mixedScore: entry.mixedScore, randomFactor: entry.randomFactor, freshnessBoost: entry.freshnessBoost, unseenBoost: entry.unseenBoost }))
  });

  return mixed;
};

const interleaveItemsBySource = (items = []) => {
  const buckets = new Map();
  const sourceOrder = [];

  for (const item of items || []) {
    const source = String(item?.source || 'Autre');
    if (!buckets.has(source)) {
      buckets.set(source, []);
      sourceOrder.push(source);
    }
    buckets.get(source).push(item);
  }

  if (sourceOrder.length <= 1) return items;

  const mixed = [];
  let hasItems = true;
  while (hasItems) {
    hasItems = false;
    for (const source of sourceOrder) {
      const queue = buckets.get(source);
      if (queue && queue.length > 0) {
        mixed.push(queue.shift());
        hasItems = true;
      }
    }
  }

  return mixed;
};

const shouldBalanceSourcesForFeed = ({ category, categories, source, viral, sort }) => (
  sort === 'newest'
  && !category
  && !(Array.isArray(categories) && categories.length > 0)
  && !source
  && !viral
);

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
  const momentumFactor = clamp(0.45 * growthFactor + 0.35 * engagementFactor + 0.20 * sentimentFactor, 0, 1);
  const uniquenessFactor = clamp(1 - (categoryShare * 0.45 + sourceShare * 0.25), 0, 1);

  const score = Math.round(
    clamp(
      18 +
      popularityFactor * 22 +
      momentumFactor * 28 +
      recency * 10 +
      sourceConfidence * 10 +
      sentimentFactor * 8 +
      uniquenessFactor * 7,
      35,
      95
    )
  );

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
      momentumFactor: Number(momentumFactor.toFixed(3)),
      uniquenessFactor: Number(uniquenessFactor.toFixed(3)),
      categoryBalance: Number(categoryBalance.toFixed(3)),
      sourceBalance: Number(sourceBalance.toFixed(3)),
      formula: '18 + 22*log(popularity) + 28*momentum + 10*recency + 10*sourceConfidence + 8*sentiment + 7*uniqueness',
      summary: 'Score d’opportunité de 35 à 95 basé sur la traction réelle, la fraîcheur, la confiance de source et la qualité du signal.'
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

const normalizeTrendMedia = (trend) => {
  if (!trend) return trend;

  const candidateImage = typeof trend.image === 'string' ? trend.image.trim() : '';
  const candidateThumbnail = typeof trend.thumbnail === 'string' ? trend.thumbnail.trim() : '';
  const hasUsableImage = (value) => Boolean(value) && !isPlaceholderMediaUrl(value);

  const image = hasUsableImage(candidateImage)
    ? candidateImage
    : hasUsableImage(candidateThumbnail)
      ? candidateThumbnail
      : candidateImage || candidateThumbnail || '';

  const thumbnail = hasUsableImage(candidateThumbnail)
    ? candidateThumbnail
    : hasUsableImage(candidateImage)
      ? candidateImage
      : candidateThumbnail || candidateImage || '';

  return {
    ...trend,
    image,
    thumbnail,
    mediaType: image ? 'image' : trend.mediaType || 'none'
  };
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeGeoInterest = (items = []) => (Array.isArray(items) ? items : [])
  .map((item) => {
    const country = String(item?.country || item?.location || '').trim();
    const countryCode = String(item?.countryCode || item?.geo || '').trim().toUpperCase();
    const value = Number(item?.value ?? item?.extracted_value ?? 0);

    if (!country || countryCode.length !== 2 || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return {
      country,
      countryCode,
      value
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.value - a.value)
  .slice(0, 25);

const saveTrends = async (trends) => {
  const normalizedInput = Array.isArray(trends) ? trends : [];

  const chunks = chunkArray(normalizedInput, 100);
  const persisted = [];

  for (const batch of chunks) {
    const ops = batch.map(async (trend) => {
      const normalizedTrend = normalizeTrendMedia(trend);
      const normalizedSource = normalizeSource(normalizedTrend.source);
      const normalizedCategory = normalizeCategory({ ...normalizedTrend, source: normalizedSource });
      const slug = normalizedTrend.slug || buildSlug({ ...normalizedTrend, source: normalizedSource, category: normalizedCategory });

      normalizedTrend.image = normalizeTrendMedia(normalizedTrend).image;
      normalizedTrend.thumbnail = normalizeTrendMedia(normalizedTrend).thumbnail;
      normalizedTrend.mediaType = normalizeTrendMedia(normalizedTrend).mediaType;
      normalizedTrend.mediaFingerprint = computeMediaFingerprint(normalizedTrend).fingerprint;
      normalizedTrend.mediaVerifiedAt = new Date();
      normalizedTrend.mediaSource = 'source-only';

      let finalTrend = normalizeTrendMedia(normalizedTrend);
      const isReddit = String(finalTrend.source || '').toLowerCase().includes('reddit');
      if (isReddit) {
        finalTrend = generateMlFeatures(finalTrend);
      }

      let mlPrediction = normalizeMlPrediction(finalTrend.ml_prediction);
      // Generate predictions for ALL sources, not just Reddit
      if (!mlPrediction || (typeof mlPrediction === 'string' && !['HIGH', 'LOW'].includes(mlPrediction))) {
        const predicted = await predictTrend(finalTrend);
        mlPrediction = safeMlPredictionValue(predicted);
      }

      const mlPredictionValue = mlPrediction || 'UNAVAILABLE';
      const credibility = evaluateTrendCredibility({
        ...finalTrend,
        source: normalizedSource,
        category: normalizedCategory
      });

      const update = {
        title: finalTrend.title,
        source: normalizedSource,
        category: normalizedCategory,
        score: typeof finalTrend.score === 'number' ? finalTrend.score : 0,
        scoreDetails: finalTrend.scoreDetails || {
          popularity: finalTrend.popularity || 0,
          growth: finalTrend.growth || 0,
          formula: '0.7 * popularity + 0.3 * growth'
        },
        credibilityScore: credibility.credibilityScore,
        credibilityConfidence: credibility.confidence,
        verificationStatus: credibility.verificationStatus,
        verifiedSources: credibility.verifiedSources,
        credibilityExplanation: credibility.explanation,
        isFakeNews: credibility.isFakeNews,
        credibilitySignals: credibility.signals,
        ml_prediction: mlPredictionValue,
        popularity: finalTrend.popularity || 0,
        growth: finalTrend.growth || 0,
        num_comments: typeof finalTrend.num_comments === 'number' ? finalTrend.num_comments : 0,
        post_length: typeof finalTrend.post_length === 'number' ? finalTrend.post_length : 0,
        hour: typeof finalTrend.hour === 'number' ? finalTrend.hour : new Date().getUTCHours(),
        title_length: typeof finalTrend.title_length === 'number' ? finalTrend.title_length : (typeof finalTrend.title === 'string' ? finalTrend.title.length : 0),
        sentiment: typeof finalTrend.sentiment === 'number' ? finalTrend.sentiment : 0,
        image: finalTrend.image || '',
        video: finalTrend.video || '',
        thumbnail: finalTrend.thumbnail || '',
        mediaType: finalTrend.mediaType || 'none',
        mediaFingerprint: finalTrend.mediaFingerprint || computeMediaFingerprint(finalTrend).fingerprint,
        mediaVerifiedAt: finalTrend.mediaVerifiedAt || new Date(),
        mediaSource: finalTrend.mediaSource || 'verification',
        link: finalTrend.link || '',
        excerpt: finalTrend.excerpt || finalTrend.title || '',
        fetchedAt: finalTrend.fetchedAt || new Date(),
        tags: Array.isArray(finalTrend.tags) ? finalTrend.tags : [],
        slug
      };

      if (Array.isArray(finalTrend.geoInterest)) {
        update.geoInterest = normalizeGeoInterest(finalTrend.geoInterest);
      }

      return Trend.findOneAndUpdate(
        { slug },
        { $set: update, $setOnInsert: { savedCount: 0 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    });

    const batchResults = await Promise.all(ops);
    persisted.push(...batchResults);
  }

  return persisted;
};

const normalizeStoredTrends = (trends = []) => scoreTrends(Array.isArray(trends) ? trends.map(generateMlFeatures) : []);

const getFeedTrends = async ({ page = 1, limit = 12, category, categories, source, sort = 'score', viral, seenIds = [], runtimeSeed } = {}) => {
  const query = {};
  if (Array.isArray(categories) && categories.length > 0) {
    query.category = { $in: categories };
  } else if (category) {
    query.category = category;
  }
  if (source) {
    query.source = { $regex: new RegExp(source, 'i') };
  }
  if (viral) {
    query.$or = [
      { ml_prediction: 1 },
      { ml_prediction: '1' },
      { ml_prediction: 'viral' }
    ];
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageLimit = Math.max(1, Number(limit) || 12);
  const skip = Math.max(0, pageNumber - 1) * pageLimit;
  const shouldBalanceSources = shouldBalanceSourcesForFeed({ category, categories, source, viral, sort });
  const queryLimit = shouldBalanceSources ? Math.min(Math.max(pageLimit * pageNumber * 4, pageLimit), 500) : pageLimit;

  let sortOption = { fetchedAt: -1, createdAt: -1 };
  if (sort === 'score') sortOption = { score: -1, updatedAt: -1 };
  else if (sort === 'trending') sortOption = { score: -1, fetchedAt: -1 };
  else if (sort === 'newest') sortOption = { fetchedAt: -1, createdAt: -1 };

  const [total, items, sourceCountsResult, categoryCountsResult] = await Promise.all([
    Trend.countDocuments(query),
    Trend.find(query)
      .sort(sortOption)
      .skip(shouldBalanceSources ? 0 : skip)
      .limit(queryLimit)
      .lean(),
    Trend.aggregate([
      { $match: query },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]),
    Trend.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
  ]);

  // Use MongoDB stored scores as-is - dynamic media enrichment disabled
  const seed = Number(runtimeSeed ?? Math.random());
  // Keep score ranking separate, but avoid a single source monopolizing the newest feed.
  const sourceBalancedItems = shouldBalanceSources
    ? interleaveItemsBySource(items).slice(skip, skip + pageLimit)
    : items;
  const mixedItems = pageNumber === 1 && sort !== 'newest' ? mixFeedItems(sourceBalancedItems, { seenIds, seed }) : sourceBalancedItems;
  const sourceCounts = Object.fromEntries((sourceCountsResult || []).map((entry) => [entry._id || 'Autre', Number(entry.count) || 0]));
  const categoryCounts = Object.fromEntries((categoryCountsResult || []).map((entry) => [entry._id || 'Non catégorisé', Number(entry.count) || 0]));
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));

  return {
    data: mixedItems,
    meta: {
      total,
      page: pageNumber,
      limit: pageLimit,
      totalPages,
      hasMore: pageNumber < totalPages,
      sourceCounts,
      categoryCounts
    }
  };
};

module.exports = {
  saveTrends,
  scoreTrends,
  getFeedTrends,
  getTrendById: async (id) => {
    if (!id || !Types.ObjectId.isValid(String(id))) return null;
    const trend = await Trend.findById(id).lean();
    if (!trend) return null;
    // Use MongoDB stored data only - dynamic media enrichment disabled
    return normalizeStoredTrends([trend])[0] || trend;
  },
  getRelatedTrends: async (id, { category, tags, source, limit = 5 } = {}) => {
    const query = { _id: { $ne: id } };
    if (category) query.category = category;
    if (source) query.source = source;
    if (Array.isArray(tags) && tags.length > 0) query.tags = { $in: tags };

    const related = await Trend.find(query).sort({ score: -1 }).limit(Number(limit)).lean();
    return normalizeStoredTrends(related);
  },
  buildSlug
};
