const axios = require('axios');
const { URL } = require('url');

const DEFAULT_PLACEHOLDER = process.env.PLACEHOLDER_IMAGE || 'https://via.placeholder.com/800x450?text=No+Image';

const safeUrl = (u) => {
  if (!u) return null;
  try {
    // unescape common HTML entities from reddit urls
    const decoded = u.replace(/&amp;/g, '&');
    const url = new URL(decoded);
    return url.toString();
  } catch (e) {
    return null;
  }
};

const extractFromReddit = (postData) => {
  if (!postData || typeof postData !== 'object') return { image: '', video: '', thumbnail: '', mediaType: 'none' };

  // video
  try {
    const media = postData.media || postData.secure_media;
    if (media && media.reddit_video && media.reddit_video.fallback_url) {
      const v = safeUrl(media.reddit_video.fallback_url);
      return { image: '', video: v, thumbnail: safeUrl(postData.thumbnail) || '', mediaType: 'video' };
    }
  } catch (e) {}

  // preview images
  try {
    if (postData.preview && Array.isArray(postData.preview.images) && postData.preview.images.length > 0) {
      const src = postData.preview.images[0].source && postData.preview.images[0].source.url;
      const image = safeUrl(src);
      const thumb = (postData.preview.images[0].resolutions && postData.preview.images[0].resolutions.slice(-1)[0] && postData.preview.images[0].resolutions.slice(-1)[0].url) || postData.thumbnail;
      return { image: image || '', video: '', thumbnail: safeUrl(thumb) || '', mediaType: image ? 'image' : 'none' };
    }
  } catch (e) {}

  // direct url (may point to image)
  try {
    const url = postData.url_overridden_by_dest || postData.url;
    const u = safeUrl(url);
    if (u && (u.match(/\.(jpeg|jpg|png|webp|gif)$/i))) {
      return { image: u, video: '', thumbnail: u, mediaType: 'image' };
    }
  } catch (e) {}

  // thumbnail field fallback
  const thumb = safeUrl(postData.thumbnail);
  if (thumb && thumb.startsWith('http')) return { image: '', video: '', thumbnail: thumb, mediaType: 'image' };

  return { image: '', video: '', thumbnail: '', mediaType: 'none' };
};

const fetchOpenGraphImage = async (url) => {
  if (!url) return null;
  try {
    const res = await axios.get(url, { timeout: 4000, headers: { 'User-Agent': 'PFA-Feed/1.0' } });
    const html = String(res.data || '');
    // try common meta tags
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) return safeUrl(ogMatch[1]);
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twitterMatch && twitterMatch[1]) return safeUrl(twitterMatch[1]);
    const linkMatch = html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
    if (linkMatch && linkMatch[1]) return safeUrl(linkMatch[1]);
  } catch (e) {
    // ignore errors, return null
  }
  return null;
};

const extractMediaForTrend = async (trend, rawPostData) => {
  // priority: reddit preview/media -> opengraph -> placeholder
  if (trend && String(trend.source).toLowerCase() === 'reddit' && rawPostData) {
    const r = extractFromReddit(rawPostData);
    if (r.mediaType && r.mediaType !== 'none') return r;
  }

  // if link exists, try OpenGraph image
  if (trend && trend.link) {
    const og = await fetchOpenGraphImage(trend.link).catch(() => null);
    if (og) {
      return { image: og, video: '', thumbnail: og, mediaType: 'image' };
    }
  }

  // fallback placeholder
  return { image: DEFAULT_PLACEHOLDER, video: '', thumbnail: DEFAULT_PLACEHOLDER, mediaType: 'none' };
};

module.exports = { extractMediaForTrend, extractFromReddit };
