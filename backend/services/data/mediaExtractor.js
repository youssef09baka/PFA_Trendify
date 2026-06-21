const { URL } = require('url');

const safeUrl = (u) => {
  if (!u) return null;
  try {
    const decoded = String(u).replace(/&amp;/g, '&');
    const url = new URL(decoded);
    return url.toString();
  } catch {
    return null;
  }
};

const isPlaceholderMediaUrl = (value) => {
  const candidate = safeUrl(String(value || ''));
  return !candidate
    || /^data:image\/svg\+xml/i.test(candidate)
    || /via\.placeholder\.com|text=No\+Image|placeholder\.com|images\.unsplash\.com/i.test(candidate);
};

const isUsableImageCandidate = (value, meta = {}) => {
  if (typeof value !== 'string') return false;

  const candidate = safeUrl(value);
  if (!candidate || !/^https?:\/\//.test(candidate)) return false;
  if (/\.svg($|\?)/i.test(candidate) || /^data:image\/svg\+xml/i.test(candidate)) return false;
  if (!/\.(jpeg|jpg|png|webp|gif|bmp|avif|heic|heif)(\?.*)?$/i.test(candidate)) return false;
  if (/\/thumb\//i.test(candidate) || /\/thumbnail\//i.test(candidate)) return false;
  if (candidate.length > 220) return false;

  const width = Number(meta.width || meta.thumbnailWidth || 0);
  const height = Number(meta.height || meta.thumbnailHeight || 0);
  if ((width && width < 320) || (height && height < 180)) return false;
  if (/logo|icon|avatar|badge|placeholder|stock|diagram|poster|thumbnail/i.test(candidate)) return false;

  return true;
};

const extractFromReddit = (postData) => {
  if (!postData || typeof postData !== 'object') {
    return { image: '', video: '', thumbnail: '', mediaType: 'none' };
  }

  try {
    const media = postData.media || postData.secure_media;
    if (media?.reddit_video?.fallback_url) {
      const video = safeUrl(media.reddit_video.fallback_url) || '';
      const thumbnail = safeUrl(postData.thumbnail) || '';
      return { image: '', video, thumbnail, mediaType: video ? 'video' : 'none' };
    }
  } catch {}

  try {
    if (postData.preview && Array.isArray(postData.preview.images) && postData.preview.images.length > 0) {
      const preview = postData.preview.images[0];
      const image = safeUrl(preview.source?.url) || '';
      const thumbSource = preview.resolutions?.slice(-1)?.[0]?.url || postData.thumbnail;
      const thumbnail = safeUrl(thumbSource) || image || '';
      return { image, video: '', thumbnail, mediaType: image || thumbnail ? 'image' : 'none' };
    }
  } catch {}

  try {
    const url = safeUrl(postData.url_overridden_by_dest || postData.url);
    if (url && /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(url)) {
      return { image: url, video: '', thumbnail: url, mediaType: 'image' };
    }
  } catch {}

  const thumbnail = safeUrl(postData.thumbnail);
  if (thumbnail && thumbnail.startsWith('http')) {
    return { image: '', video: '', thumbnail, mediaType: 'image' };
  }

  return { image: '', video: '', thumbnail: '', mediaType: 'none' };
};

const extractMediaForTrend = async (trend, rawPostData) => {
  if (trend && String(trend.source || '').toLowerCase() === 'reddit' && rawPostData) {
    const redditMedia = extractFromReddit(rawPostData);
    if (redditMedia.mediaType && redditMedia.mediaType !== 'none') return redditMedia;
  }

  const image = safeUrl(trend?.image || '');
  const thumbnail = safeUrl(trend?.thumbnail || '');
  const video = safeUrl(trend?.video || '');

  if (image && !isPlaceholderMediaUrl(image)) {
    return { image, video: '', thumbnail: thumbnail || image, mediaType: 'image' };
  }

  if (thumbnail && !isPlaceholderMediaUrl(thumbnail)) {
    return { image: '', video: '', thumbnail, mediaType: 'image' };
  }

  if (video) {
    return { image: '', video, thumbnail: '', mediaType: 'video' };
  }

  return { image: '', video: '', thumbnail: '', mediaType: 'none' };
};

const buildSearchQueries = () => [];

module.exports = {
  extractMediaForTrend,
  extractFromReddit,
  isPlaceholderMediaUrl,
  isUsableImageCandidate,
  buildSearchQueries
};
