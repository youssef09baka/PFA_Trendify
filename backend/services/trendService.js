const Trend = require("../models/Trend");
const { extractMediaForTrend, isPlaceholderMediaUrl } = require('./data/mediaExtractor');
const { computeMediaFingerprint, findDuplicateMediaCandidates } = require('./data/mediaUniqueness');

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
  const raw = Math.max(0, Number(value) || 0);
  const safeMax = Math.max(1, Number(max) || 1);
  return clamp(Math.log1p(raw) / Math.log1p(safeMax), 0, 1);
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

const shouldRefreshMedia = (trend) => {
  if (!trend) return false;
  const hasPlaceholder = isPlaceholderMediaUrl(trend.image) || isPlaceholderMediaUrl(trend.thumbnail);
  return hasPlaceholder || trend.mediaType === 'none' || (!trend.image && !trend.thumbnail && !trend.video);
};

const refreshTrendMedia = async (trend) => {
  if (!shouldRefreshMedia(trend)) return trend;

  try {
    const media = await extractMediaForTrend(trend, trend._raw || null).catch(() => null);
    if (!media || (!media.image && !media.thumbnail)) return trend;

    const image = media.image || media.thumbnail || trend.image || '';
    const thumbnail = media.thumbnail || image || trend.thumbnail || '';
    const updated = await Trend.findByIdAndUpdate(
      trend._id,
      {
        $set: {
          image,
          thumbnail,
          mediaType: media.mediaType || 'image',
          mediaFingerprint: computeMediaFingerprint({ ...trend, image, thumbnail }).fingerprint,
          mediaVerifiedAt: new Date(),
          mediaSource: 'runtime-refresh'
        }
      },
      { new: true }
    ).lean();

    return updated || { ...trend, image, thumbnail, mediaType: media.mediaType || 'image' };
  } catch {
    return trend;
  }
};

const shouldRepairDuplicateMedia = (trend) => {
  if (!trend) return false;
  const fingerprint = computeMediaFingerprint(trend).fingerprint;
  return Boolean(fingerprint && fingerprint !== 'none' && (!trend.mediaVerifiedAt || Date.now() - new Date(trend.mediaVerifiedAt).getTime() > 6 * 60 * 60 * 1000));
};

const repairDuplicateMedia = async (trends = []) => {
  const duplicates = findDuplicateMediaCandidates(trends);
  if (duplicates.length === 0) return trends;

  const candidates = new Set();
  for (const entry of duplicates) {
    candidates.add(String(entry.left?._id || entry.left?.slug || ''));
    candidates.add(String(entry.right?._id || entry.right?.slug || ''));
  }

  const repairs = [];
  for (const trend of trends) {
    const candidateKey = String(trend?._id || trend?.slug || '');
    if (!candidates.has(candidateKey)) continue;
    if (!shouldRepairDuplicateMedia(trend)) continue;

    try {
      const fresh = await extractMediaForTrend(trend, trend._raw || null).catch(() => null);
      if (!fresh || (!fresh.image && !fresh.thumbnail)) continue;
      const nextImage = fresh.image || fresh.thumbnail || trend.image || '';
      const nextThumbnail = fresh.thumbnail || nextImage || trend.thumbnail || '';
      if (!nextImage || nextImage === trend.image) continue;

      repairs.push(
        Trend.findOneAndUpdate(
          { _id: trend._id || trend.slug },
          {
            $set: {
              image: nextImage,
              thumbnail: nextThumbnail,
              mediaType: fresh.mediaType || trend.mediaType || 'image',
              mediaFingerprint: computeMediaFingerprint({ ...trend, image: nextImage, thumbnail: nextThumbnail }).fingerprint,
              mediaVerifiedAt: new Date(),
              mediaSource: 'verified-duplicate-repair'
            }
          },
          { new: true }
        ).lean()
      );
    } catch (error) {
      console.warn('[MEDIA] duplicate repair failed', error.message);
    }
  }

  await Promise.all(repairs);
  return trends;
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const saveTrends = async (trends) => {
  const normalizedInput = Array.isArray(trends) ? trends : [];
  await repairDuplicateMedia(normalizedInput);

  const chunks = chunkArray(normalizedInput, 100);
  const persisted = [];

  for (const batch of chunks) {
    const ops = batch.map(async (trend) => {
      const normalizedSource = normalizeSource(trend.source);
      const normalizedCategory = normalizeCategory({ ...trend, source: normalizedSource });
      const slug = trend.slug || buildSlug({ ...trend, source: normalizedSource, category: normalizedCategory });

      try {
        const mediaFingerprint = computeMediaFingerprint(trend).fingerprint;
        if (shouldRefreshMedia(trend) || (mediaFingerprint && mediaFingerprint !== 'none' && (!trend.mediaVerifiedAt || Date.now() - new Date(trend.mediaVerifiedAt).getTime() > 6 * 60 * 60 * 1000))) {
          const m = await extractMediaForTrend(trend, trend._raw || null).catch(() => null);
          if (m) {
            trend.image = m.image || trend.image || '';
            trend.video = m.video || trend.video || '';
            trend.thumbnail = m.thumbnail || trend.thumbnail || trend.image || '';
            trend.mediaType = m.mediaType || trend.mediaType || 'image';
            trend.mediaFingerprint = computeMediaFingerprint({ ...trend, image: trend.image, thumbnail: trend.thumbnail }).fingerprint;
            trend.mediaVerifiedAt = new Date();
            trend.mediaSource = 'verification';
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
        mediaFingerprint: trend.mediaFingerprint || computeMediaFingerprint(trend).fingerprint,
        mediaVerifiedAt: trend.mediaVerifiedAt || new Date(),
        mediaSource: trend.mediaSource || 'verification',
        link: trend.link || '',
        excerpt: trend.excerpt || trend.title || '',
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

    const batchResults = await Promise.all(ops);
    persisted.push(...batchResults);
  }

  return persisted;
};

const normalizeStoredTrends = (trends = []) => scoreTrends(Array.isArray(trends) ? trends : []);

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

  const [total, items, sourceCountsResult, categoryCountsResult] = await Promise.all([
    Trend.countDocuments(query),
    Trend.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
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

  const refreshedItems = await Promise.all((items || []).map((item) => refreshTrendMedia(item)));
  await repairDuplicateMedia(refreshedItems);
  const scoredItems = normalizeStoredTrends(refreshedItems);
  const sourceCounts = Object.fromEntries((sourceCountsResult || []).map((entry) => [entry._id || 'Autre', Number(entry.count) || 0]));
  const categoryCounts = Object.fromEntries((categoryCountsResult || []).map((entry) => [entry._id || 'Non catégorisé', Number(entry.count) || 0]));
  const totalPages = Math.max(1, Math.ceil(total / Number(limit)));

  return {
    data: scoredItems,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasMore: Number(page) < totalPages,
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
    if (!id) return null;
    const trend = await Trend.findById(id).lean();
    if (!trend) return null;
    const refreshed = await refreshTrendMedia(trend);
    return normalizeStoredTrends([refreshed])[0] || refreshed;
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
