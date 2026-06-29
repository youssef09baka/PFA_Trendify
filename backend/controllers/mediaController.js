const { Types } = require("mongoose");
const asyncHandler = require("../middleware/asyncHandler");
const Trend = require("../models/Trend");
const { isPlaceholderMediaUrl } = require("../services/data/mediaExtractor");
const { computeMediaFingerprint } = require("../services/data/mediaUniqueness");

const DEFAULT_REPAIR_LIMIT = 100;
const MAX_REPAIR_LIMIT = 500;

const clampLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_REPAIR_LIMIT;
  return Math.min(Math.floor(parsed), MAX_REPAIR_LIMIT);
};

const getTrendIds = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => Types.ObjectId.isValid(item));
};

const hasUsableMedia = (value) => Boolean(value) && !isPlaceholderMediaUrl(value);

const normalizeTrendMedia = (trend) => {
  const image = String(trend?.image || "").trim();
  const thumbnail = String(trend?.thumbnail || "").trim();
  const video = String(trend?.video || "").trim();

  if (hasUsableMedia(image)) {
    return {
      image,
      thumbnail: hasUsableMedia(thumbnail) ? thumbnail : image,
      video,
      mediaType: "image"
    };
  }

  if (hasUsableMedia(thumbnail)) {
    return {
      image: thumbnail,
      thumbnail,
      video,
      mediaType: "image"
    };
  }

  if (hasUsableMedia(video)) {
    return {
      image: "",
      thumbnail: "",
      video,
      mediaType: "video"
    };
  }

  return {
    image: "",
    thumbnail: "",
    video: "",
    mediaType: "none"
  };
};

const buildRepairQuery = (ids) => {
  if (ids.length) {
    return { _id: { $in: ids } };
  }

  return {
    $or: [
      { image: { $in: ["", null] }, thumbnail: { $nin: ["", null] } },
      { mediaType: { $nin: ["image", "video", "none"] } },
      { mediaFingerprint: { $in: ["", null] } }
    ]
  };
};

const repairMedia = asyncHandler(async (req, res) => {
  const ids = getTrendIds(req.body?.ids);
  const limit = ids.length ? ids.length : clampLimit(req.body?.limit);

  const trends = await Trend.find(buildRepairQuery(ids))
    .select("image thumbnail video mediaType mediaFingerprint title source category")
    .limit(limit)
    .lean();

  let repaired = 0;
  const items = [];

  for (const trend of trends) {
    const media = normalizeTrendMedia(trend);
    const fingerprint = computeMediaFingerprint({ ...trend, ...media }).fingerprint;
    const update = {
      ...media,
      mediaFingerprint: fingerprint || "none",
      mediaVerifiedAt: new Date(),
      mediaSource: "repair"
    };

    const changed = (
      media.image !== (trend.image || "") ||
      media.thumbnail !== (trend.thumbnail || "") ||
      media.video !== (trend.video || "") ||
      media.mediaType !== (trend.mediaType || "none") ||
      update.mediaFingerprint !== (trend.mediaFingerprint || "")
    );

    if (changed) {
      await Trend.findByIdAndUpdate(trend._id, { $set: update });
      repaired += 1;
    }

    items.push({
      id: trend._id,
      repaired: changed,
      mediaType: media.mediaType,
      image: media.image,
      thumbnail: media.thumbnail
    });
  }

  res.status(200).json({
    success: true,
    scanned: trends.length,
    repaired,
    items
  });
});

module.exports = {
  repairMedia,
  normalizeTrendMedia
};
