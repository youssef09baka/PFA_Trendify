const Trend = require('../../models/Trend');
const { extractMediaForTrend, isPlaceholderMediaUrl } = require('./mediaExtractor');
const { computeMediaFingerprint } = require('./mediaUniqueness');

const BATCH_SIZE = 50;

const isFallbackVisual = (trend) => {
  const candidate = String(trend?.image || trend?.thumbnail || '');
  return /images\.unsplash\.com|via\.placeholder\.com|placeholder\.com/i.test(candidate) || isPlaceholderMediaUrl(candidate);
};

const shouldRepairPersistedMedia = (trend, { force = false } = {}) => {
  if (!trend) return false;
  if (!isFallbackVisual(trend)) return false;
  const fingerprint = computeMediaFingerprint(trend).fingerprint;
  if (!fingerprint || fingerprint === 'none') return false;
  if (force) return true;
  return !trend.mediaVerifiedAt || Date.now() - new Date(trend.mediaVerifiedAt).getTime() > 6 * 60 * 60 * 1000;
};

const collectRepeatedFallbackUrls = (trends = []) => {
  const counts = new Map();

  for (const trend of trends) {
    const candidate = String(trend?.image || trend?.thumbnail || '');
    if (!candidate || !isFallbackVisual(trend)) continue;
    counts.set(candidate, (counts.get(candidate) || 0) + 1);
  }

  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([url]) => url));
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const repairPersistedDuplicateMedia = async ({ force = true } = {}) => {
  try {
    const allTrends = await Trend.find({}).sort({ fetchedAt: -1 }).lean();
    if (!Array.isArray(allTrends) || allTrends.length === 0) {
      console.info('[MEDIA] no persisted trends found for duplicate repair');
      return { scanned: 0, repaired: 0, invalidated: 0, repeatedFallbackImages: 0 };
    }

    const repeatedFallbackUrls = collectRepeatedFallbackUrls(allTrends);
    if (repeatedFallbackUrls.size === 0) {
      console.info('[MEDIA] duplicate media repair skipped — no repeated fallback visuals found');
      return { scanned: allTrends.length, repaired: 0, invalidated: 0, repeatedFallbackImages: 0 };
    }

    const repairBatch = allTrends.filter((trend) => {
      const candidate = String(trend?.image || trend?.thumbnail || '');
      return repeatedFallbackUrls.has(candidate) && shouldRepairPersistedMedia(trend, { force });
    });

    if (repairBatch.length === 0) {
      console.info('[MEDIA] duplicate media repair skipped — no repeated fallback visuals eligible for repair');
      return { scanned: allTrends.length, repaired: 0, invalidated: 0, repeatedFallbackImages: repeatedFallbackUrls.size };
    }

    let repaired = 0;
    let invalidated = 0;

    for (const batch of chunkArray(repairBatch, BATCH_SIZE)) {
      const operations = batch.map(async (trend) => {
        const oldImage = String(trend.image || trend.thumbnail || '');
        const media = await extractMediaForTrend(trend, trend._raw || null).catch(() => null);

        if (!media || (!media.image && !media.thumbnail)) return null;
        const newImage = media.image || media.thumbnail || '';
        const newThumbnail = media.thumbnail || newImage || '';

        if (!newImage || newImage === oldImage) return null;

        if (oldImage) {
          console.info(`[MEDIA] invalidating repeated fallback image for ${trend.title || trend.slug}: ${oldImage}`);
          invalidated += 1;
        }
        repaired += 1;

        return Trend.findByIdAndUpdate(
          trend._id,
          {
            $set: {
              image: newImage,
              thumbnail: newThumbnail,
              mediaType: media.mediaType || 'image',
              mediaFingerprint: computeMediaFingerprint({ ...trend, image: newImage, thumbnail: newThumbnail }).fingerprint,
              mediaVerifiedAt: new Date(),
              mediaSource: force ? 'forced-migration-repair' : 'migration-repair'
            }
          },
          { new: true }
        );
      });

      await Promise.all(operations);
    }

    console.info(`[MEDIA] forced duplicate media repair completed — scanned: ${allTrends.length}, repaired: ${repaired}, invalidated: ${invalidated}, repeatedFallbackImages: ${repeatedFallbackUrls.size}`);
    return { scanned: allTrends.length, repaired, invalidated, repeatedFallbackImages: repeatedFallbackUrls.size };
  } catch (error) {
    console.error('[MEDIA] duplicate media repair failed:', error.message || error);
    return { scanned: 0, repaired: 0, invalidated: 0, repeatedFallbackImages: 0 };
  }
};

const backfillMissingTrendImages = async () => {
  try {
    const trends = await Trend.find({
      $or: [
        { image: { $in: ['', null] } },
        { thumbnail: { $in: ['', null] } }
      ]
    })
      .sort({ fetchedAt: -1 })
      .limit(400)
      .lean();

    if (!Array.isArray(trends) || trends.length === 0) {
      console.info('[MEDIA] no missing images found for backfill');
      return { processed: 0, updated: 0 };
    }

    const chunks = chunkArray(trends, BATCH_SIZE);
    let updated = 0;

    for (const batch of chunks) {
      const operations = batch.map(async (trend) => {
        const media = await extractMediaForTrend(trend, trend._raw).catch(() => null);
        if (!media || (!media.image && !media.thumbnail)) return null;

        const image = media.image || media.thumbnail || '';
        return Trend.findByIdAndUpdate(
          trend._id,
          {
            $set: {
              image,
              thumbnail: media.thumbnail || image,
              mediaType: media.mediaType || 'image',
              fetchedAt: trend.fetchedAt || new Date()
            }
          },
          { new: true }
        );
      });

      const results = await Promise.all(operations);
      updated += results.filter(Boolean).length;
    }

    console.info(`[MEDIA] missing-image backfill completed — updated: ${updated}`);
    return { processed: trends.length, updated };
  } catch (error) {
    console.error('[MEDIA] missing-image backfill failed:', error.message || error);
    return { processed: 0, updated: 0 };
  }
};

module.exports = { backfillMissingTrendImages, repairPersistedDuplicateMedia };
