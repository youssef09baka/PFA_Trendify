const Trend = require('../../models/Trend');
const { extractMediaForTrend, isPlaceholderMediaUrl, isUsableImageCandidate } = require('./mediaExtractor');
const { computeMediaFingerprint } = require('./mediaUniqueness');

const BATCH_SIZE = 50;

const isFallbackVisual = (trend) => {
  const candidate = String(trend?.image || trend?.thumbnail || '');
  // Only SVG and placeholder URLs are fallback now (Unsplash removed)
  return /data:image\/svg\+xml|via\.placeholder\.com|placeholder\.com/i.test(candidate)
    || isPlaceholderMediaUrl(candidate);
};

const shouldRepairPersistedMedia = (trend, { force = false } = {}) => {
  if (!trend) return false;
  if (!isFallbackVisual(trend)) return false;
  const fingerprint = computeMediaFingerprint(trend).fingerprint;
  if (!fingerprint || fingerprint === 'none') return false;
  if (force) return true;
  return !trend.mediaVerifiedAt || Date.now() - new Date(trend.mediaVerifiedAt).getTime() > 6 * 60 * 60 * 1000;
};

const collectFallbackVisuals = (trends = []) => {
  const unique = new Set();

  for (const trend of trends) {
    const candidate = String(trend?.image || trend?.thumbnail || '');
    if (!candidate || !isFallbackVisual(trend)) continue;
    unique.add(candidate);
  }

  return unique;
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
      console.info('[MEDIA] no persisted trends found for fallback repair');
      return { scanned: 0, repaired: 0, invalidated: 0, repeatedFallbackImages: 0 };
    }

    const fallbackVisuals = collectFallbackVisuals(allTrends);
    const repairBatch = allTrends.filter((trend) => shouldRepairPersistedMedia(trend, { force }));

    console.info('[MEDIA] fallback repair scan', {
      scanned: allTrends.length,
      fallbackVisuals: fallbackVisuals.size,
      eligibleForRepair: repairBatch.length,
    });

    if (repairBatch.length === 0) {
      console.info('[MEDIA] fallback repair skipped — no persisted fallback visuals eligible for repair');
      return { scanned: allTrends.length, repaired: 0, invalidated: 0, repeatedFallbackImages: fallbackVisuals.size };
    }

    let repaired = 0;
    let invalidated = 0;

    for (const batch of chunkArray(repairBatch, BATCH_SIZE)) {
      const operations = batch.map(async (trend) => {
        const oldImage = String(trend.image || trend.thumbnail || '');
        const media = await extractMediaForTrend(trend, trend._raw || null).catch(() => null);

        if (!media || (!media.image && !media.thumbnail)) {
          console.info('[MEDIA] fallback repair skipped', { title: trend.title || trend.slug, reason: 'no-retrieved-url' });
          return null;
        }

        const newImage = media.image || media.thumbnail || '';
        const newThumbnail = media.thumbnail || newImage || '';

        const isRealCandidate = isUsableImageCandidate(newImage) && !isFallbackVisual({ image: newImage, thumbnail: newThumbnail });
        if (!newImage || newImage === oldImage || !isRealCandidate) {
          console.info('[MEDIA] fallback repair skipped', {
            title: trend.title || trend.slug,
            oldImage,
            newImage,
            reason: !isRealCandidate ? 'fallback-or-invalid-url' : 'unchanged-url',
          });
          return null;
        }

        invalidated += 1;
        repaired += 1;
        console.info('[MEDIA] invalidating fallback media', { title: trend.title || trend.slug, oldImage, newImage });

        return Trend.findByIdAndUpdate(
          trend._id,
          {
            $set: {
              image: newImage,
              thumbnail: newThumbnail,
              mediaType: media.mediaType || 'image',
              mediaFingerprint: computeMediaFingerprint({ ...trend, image: newImage, thumbnail: newThumbnail }).fingerprint,
              mediaVerifiedAt: new Date(),
              mediaSource: 'forced-fallback-repair'
            }
          },
          { new: true }
        );
      });

      await Promise.all(operations);
    }

    console.info('[MEDIA] fallback repair completed', {
      scanned: allTrends.length,
      repaired,
      invalidated,
      fallbackVisuals: fallbackVisuals.size,
    });
    return { scanned: allTrends.length, repaired, invalidated, repeatedFallbackImages: fallbackVisuals.size };
  } catch (error) {
    console.error('[MEDIA] fallback repair failed:', error.message || error);
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
