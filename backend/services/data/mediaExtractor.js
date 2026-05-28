const axios = require('axios');
const { URL } = require('url');

const IMAGE_SEARCH_CACHE = new Map();
const FALLBACK_IMAGE_CACHE = new Map();
const SUCCESS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_THROTTLE_MS = 400;
const RETRY_DELAY_MS = 1200;
let LAST_EXTERNAL_REQUEST_AT = 0;

const logMediaDebug = (stage, details) => {
  console.info(`[MEDIA-DEBUG] ${stage}`, details);
};

const QUALITY_RULES = {
  minWidth: 320,
  minHeight: 180,
  maxPathLength: 220,
};

const REJECT_IMAGE_HINTS = /logo|icon|avatar|badge|placeholder|stock|diagram|poster|thumbnail/i;

const isUsableImageCandidate = (value, meta = {}) => {
  if (typeof value !== 'string') return false;

  const candidate = safeUrl(value);
  if (!candidate || !/^https?:\/\//.test(candidate)) return false;
  if (/\.svg($|\?)/i.test(candidate) || /^data:image\/svg\+xml/i.test(candidate)) return false;
  if (!/\.(jpeg|jpg|png|webp|gif|bmp|avif|heic|heif)(\?.*)?$/i.test(candidate)) return false;
  if (/\/thumb\//i.test(candidate) || /\/thumbnail\//i.test(candidate)) return false;
  if (candidate.length > QUALITY_RULES.maxPathLength) return false;

  const width = Number(meta.width || meta.thumbnailWidth || 0);
  const height = Number(meta.height || meta.thumbnailHeight || 0);
  if ((width && width < QUALITY_RULES.minWidth) || (height && height < QUALITY_RULES.minHeight)) return false;
  if (REJECT_IMAGE_HINTS.test(candidate)) return false;

  return true;
};

const FALLBACK_THEME_IMAGES = {
  food: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#fff4e6"/><stop offset="1" stop-color="#ffe2b8"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="300" cy="260" r="120" fill="#ffcc80" opacity="0.55"/><circle cx="900" cy="240" r="140" fill="#ffd54f" opacity="0.35"/><rect x="180" y="420" width="840" height="180" rx="90" fill="#fff" opacity="0.72"/><text x="600" y="520" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#8d5a2b">Food / Restaurant</text></svg>')],
  sports: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#eef6ff"/><stop offset="1" stop-color="#dbeafe"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="150" y="140" width="900" height="520" rx="70" fill="#ffffff" opacity="0.75"/><path d="M260 420c100-150 220-220 360-220s260 70 360 220" fill="none" stroke="#2563eb" stroke-width="18" stroke-linecap="round"/><circle cx="600" cy="300" r="90" fill="#60a5fa" opacity="0.25"/><text x="600" y="520" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#1e3a8a">Sports / Event</text></svg>')],
  finance: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#ecfdf5"/><stop offset="1" stop-color="#d1fae5"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="160" y="180" width="880" height="440" rx="60" fill="#ffffff" opacity="0.78"/><path d="M260 520L420 380L560 450L780 260L940 340" fill="none" stroke="#10b981" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><text x="600" y="615" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#065f46">Finance / Markets</text></svg>')],
  tech: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f5f3ff"/><stop offset="1" stop-color="#ede9fe"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="220" y="180" width="760" height="440" rx="70" fill="#ffffff" opacity="0.78"/><rect x="330" y="280" width="540" height="220" rx="40" fill="#8b5cf6" opacity="0.14"/><text x="600" y="520" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#5b21b6">Technology / AI</text></svg>')],
  science: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#eff6ff"/><stop offset="1" stop-color="#dbeafe"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="600" cy="320" r="140" fill="#38bdf8" opacity="0.18"/><path d="M370 520C430 400 490 340 600 340S770 400 830 520" fill="none" stroke="#0ea5e9" stroke-width="16" stroke-linecap="round"/><text x="600" y="620" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#0c4a6e">Science / Research</text></svg>')],
  culture: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#fff7ed"/><stop offset="1" stop-color="#ffedd5"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="190" y="170" width="820" height="460" rx="70" fill="#ffffff" opacity="0.75"/><text x="600" y="520" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#9a5b00">Culture / Entertainment</text></svg>')],
  default: ['data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="180" y="160" width="840" height="480" rx="70" fill="#ffffff" opacity="0.75"/><text x="600" y="510" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" fill="#334155">News / General</text></svg>')]
};

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

const normalizeQuery = (value) => String(value || '')
  .replace(/[\u2018\u2019]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b(the|a|an|of|and|to|for|with|in|on|at|from|by|via|into|over|under|new|old|latest|today|news|update|trends|trend)\b/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const ENTITY_ENRICHMENTS = {
  ferrari: ['Ferrari sports car', 'Ferrari F40 racing car', 'Ferrari automotive photography'],
  tesla: ['Tesla electric vehicle company', 'Tesla Model Y EV', 'Tesla automotive image'],
  chipotle: ['Chipotle Mexican Grill restaurant', 'Chipotle burrito bowl', 'Chipotle restaurant food'],
  usps: ['USPS postal service delivery', 'USPS mail truck', 'USPS delivery logistics'],
  nba: ['NBA basketball finals', 'NBA basketball game', 'NBA arena basketball'],
  amazon: ['Amazon delivery logistics', 'Amazon warehouse fulfillment', 'Amazon parcel service'],
  apple: ['Apple technology company', 'Apple product launch', 'Apple iPhone device'],
  microsoft: ['Microsoft software company', 'Microsoft cloud platform', 'Microsoft product launch'],
  google: ['Google technology company', 'Google product launch', 'Google AI platform'],
  openai: ['OpenAI AI model', 'OpenAI technology company', 'OpenAI product'],
  meta: ['Meta social platform', 'Meta AI company', 'Meta technology'],
  gta: ['Grand Theft Auto VI video game', 'GTA 6 game cover', 'Grand Theft Auto game'],
  mrbeast: ['MrBeast YouTube creator', 'MrBeast challenge video', 'MrBeast entertainment'],
};

const extractSemanticKeywords = (value) => {
  const words = normalizeQuery(value)
    .split(' ')
    .filter((word) => word.length >= 3 && !/\d+/.test(word))
    .filter((word) => !['stock', 'market', 'news', 'latest', 'today', 'trends', 'trend', 'update', 'vs', 'vs.', 'how', 'why', 'when'].includes(word.toLowerCase()));

  return [...new Set(words)].slice(0, 6);
};

const inferEntityContext = (trend) => {
  const text = `${trend?.title || ''} ${trend?.category || ''}`.toLowerCase();
  const matches = Object.keys(ENTITY_ENRICHMENTS).filter((key) => text.includes(key));
  return matches.length ? matches[0] : null;
};

const normalizeSemanticEntityQuery = (trend) => {
  const title = normalizeQuery(trend?.title || '');
  const category = normalizeQuery(trend?.category || '');
  const entityKey = inferEntityContext(trend);

  if (!title) return '';

  const canonical = {
    'gta 6': 'Grand Theft Auto VI video game',
    'nba finals': 'NBA basketball finals',
    'apple': 'Apple technology company',
    'chipotle': 'Chipotle Mexican Grill restaurant',
    'tesla': 'Tesla electric vehicle company',
    'mrbeast': 'MrBeast YouTube creator',
    'usps': 'USPS postal service',
  };

  const direct = canonical[title.toLowerCase()] || canonical[entityKey || ''] || '';
  const semantic = direct ? `${direct} ${category || inferFallbackCategory(trend)}`.trim() : '';

  return semantic;
};

const inferFallbackCategory = (trend) => {
  const text = `${trend?.category || ''} ${trend?.title || ''}`.toLowerCase();
  if (/food|restaurant|chipotle|burger|pizza|coffee|meal|recipe|eat|drinks/i.test(text)) return 'food';
  if (/sport|game|match|nba|soccer|football|tennis|baseball|final|cup|ticket|league|olympic/i.test(text)) return 'sports';
  if (/finance|stock|market|crypto|bank|invest|econom|price|shares|inflation|bond/i.test(text)) return 'finance';
  if (/ai|tech|robot|software|data|model|gpt|llm|cloud|app|cyber|digital/i.test(text)) return 'tech';
  if (/science|health|research|climate|biology|space|lab|medical|study/i.test(text)) return 'science';
  if (/movie|music|show|film|culture|entertain|celebrity|artist|game/i.test(text)) return 'culture';
  return 'default';
};

const isGenericSource = (value) => /google trends|google|reddit|youtube|news|trends/i.test(String(value || ''));

const buildSearchQueries = (trend) => {
  const title = normalizeQuery(trend?.title);
  const category = normalizeQuery(trend?.category);
  const source = normalizeQuery(trend?.source_detail || trend?.source);
  const keywords = extractSemanticKeywords(trend?.title || '');
  const keywordPhrase = keywords.join(' ');
  const entityKey = inferEntityContext(trend);
  const entityBoost = entityKey ? ENTITY_ENRICHMENTS[entityKey] : [];
  const semanticCategory = category || inferFallbackCategory(trend) || 'news';

  const semanticEntityQuery = normalizeSemanticEntityQuery(trend);

  const queries = [
    semanticEntityQuery || title,
    title,
    title && category && title !== category ? `${title} ${category}` : '',
    keywordPhrase ? `${keywordPhrase} ${semanticCategory}` : '',
    entityBoost[0] || '',
    entityBoost[1] || '',
    entityBoost[2] || '',
    semanticEntityQuery ? `${semanticEntityQuery} photo` : '',
    semanticEntityQuery ? `${semanticEntityQuery} real image` : '',
    title && source && !isGenericSource(source) ? `${title} ${source}` : '',
    title && source && !isGenericSource(source) ? `${title} ${semanticCategory} ${source}` : ''
  ].filter(Boolean);

  return [...new Set(queries)].slice(0, 8);
};

const simpleHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCacheEntry = (cache, key, ttlMs) => {
  const entry = cache.get(key);
  return entry && Date.now() - entry.timestamp < ttlMs ? entry : null;
};

const waitForThrottle = async (label) => {
  const waitMs = Math.max(0, REQUEST_THROTTLE_MS - (Date.now() - LAST_EXTERNAL_REQUEST_AT));
  if (waitMs > 0) {
    logMediaDebug('THROTTLE_WAIT', { label, waitMs });
    await sleep(waitMs);
  }
  LAST_EXTERNAL_REQUEST_AT = Date.now();
};

const isRetryableError = (error) => {
  const status = error?.response?.status;
  const message = String(error?.message || '');
  return status === 429 || status === 403 || status === 408 || /timeout|timed out|429|403/i.test(message);
};

const fetchWithRetry = async (label, runner) => {
  try {
    await waitForThrottle(label);
    return await runner();
  } catch (error) {
    if (!isRetryableError(error)) throw error;

    logMediaDebug('RETRY_ATTEMPT', { label, reason: 'rate-limit-or-timeout', attempt: 1, status: error?.response?.status || null });
    await sleep(RETRY_DELAY_MS);
    await waitForThrottle(`${label}:retry`);
    return runner();
  }
};

const getFallbackThemeImage = (trend) => {
  const categoryKey = inferFallbackCategory(trend);
  const palette = FALLBACK_THEME_IMAGES[categoryKey] || FALLBACK_THEME_IMAGES.default;

  const query = normalizeQuery([trend?.title, trend?.category, trend?.source_detail || trend?.source].filter(Boolean).join(' '));
  const cacheKey = `${query}|${trend?._id || trend?.slug || trend?.title || 'trend'}`;
  const cached = FALLBACK_IMAGE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FALLBACK_CACHE_TTL_MS) {
    return cached.value;
  }

  const choice = palette[simpleHash(`${cacheKey}|${trend?.category || ''}|${trend?.source || ''}`) % palette.length];
  FALLBACK_IMAGE_CACHE.set(cacheKey, { value: choice, timestamp: Date.now() });
  return choice;
};

const fetchWikimediaImage = async (query, options = {}) => {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  const excludeUrls = new Set((options.excludeUrls || []).map((entry) => safeUrl(entry)).filter(Boolean));
  const cacheKey = `wikimedia:${normalized}:${Array.from(excludeUrls).join('|')}`;
  const cached = getCacheEntry(IMAGE_SEARCH_CACHE, cacheKey, SUCCESS_CACHE_TTL_MS);
  if (cached) {
    logMediaDebug('CACHE_HIT', { label: 'wikimedia', key: cacheKey, source: 'success' });
    return cached.value;
  }
  const failed = getCacheEntry(IMAGE_SEARCH_CACHE, `${cacheKey}:failed`, FAILURE_CACHE_TTL_MS);
  if (failed) {
    logMediaDebug('CACHE_SKIP', { label: 'wikimedia', key: cacheKey, reason: 'recent-failure' });
    return null;
  }

  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(normalized)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`;
    logMediaDebug('WIKIMEDIA_REQUEST', { query: normalized, url });

    const res = await fetchWithRetry('wikimedia', () => axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'PFA-Feed/1.0' } }));
    const pages = res.data?.query?.pages || {};
    const results = Object.values(pages)
      .map((entry) => {
        const imageInfo = entry?.imageinfo?.[0] || {};
        const candidate = safeUrl(imageInfo.url || entry?.thumbnail?.source || '');
        return {
          url: candidate,
          width: Number(imageInfo.width || entry?.thumbnail?.width || 0),
          height: Number(imageInfo.height || entry?.thumbnail?.height || 0),
        };
      })
      .filter((entry) => isUsableImageCandidate(entry.url, entry))
      .filter((entry) => !excludeUrls.has(entry.url));

    logMediaDebug('WIKIMEDIA_RESPONSE', { query: normalized, resultsCount: results.length, rejected: excludeUrls.size });

    const firstImage = results[0]?.url || null;
    if (firstImage) {
      IMAGE_SEARCH_CACHE.set(cacheKey, { value: firstImage, timestamp: Date.now() });
      logMediaDebug('CACHE_STORE', { label: 'wikimedia', key: cacheKey, ttlMs: SUCCESS_CACHE_TTL_MS });
      return firstImage;
    }
  } catch (e) {
    logMediaDebug('WIKIMEDIA_ERROR', { query: normalized, message: e?.message || 'request-failed', status: e?.response?.status || null });
  }

  IMAGE_SEARCH_CACHE.set(`${cacheKey}:failed`, { value: null, timestamp: Date.now() });
  return null;
};

const fetchOpenverseImage = async (query, options = {}) => {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  const excludeUrls = new Set((options.excludeUrls || []).map((entry) => safeUrl(entry)).filter(Boolean));
  const cacheKey = `openverse:${normalized}:${Array.from(excludeUrls).join('|')}`;
  const cached = getCacheEntry(IMAGE_SEARCH_CACHE, cacheKey, SUCCESS_CACHE_TTL_MS);
  if (cached) {
    logMediaDebug('CACHE_HIT', { label: 'openverse', key: cacheKey, source: 'success' });
    return cached.value;
  }
  const failed = getCacheEntry(IMAGE_SEARCH_CACHE, `${cacheKey}:failed`, FAILURE_CACHE_TTL_MS);
  if (failed) {
    logMediaDebug('CACHE_SKIP', { label: 'openverse', key: cacheKey, reason: 'recent-failure' });
    return null;
  }

  try {
    const url = `https://openverse.org/api/v1/images/?q=${encodeURIComponent(normalized)}&page_size=6&format=json`;
    logMediaDebug('OPENVERSE_REQUEST', { query: normalized, url });

    const res = await fetchWithRetry('openverse', () => axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'PFA-Feed/1.0' } }));
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    logMediaDebug('OPENVERSE_RESPONSE', { query: normalized, resultsCount: results.length, rejected: excludeUrls.size });

    const firstImage = results
      .map((entry) => ({
        url: safeUrl(entry?.url || entry?.thumbnail || entry?.preview || entry?.src || ''),
        width: Number(entry?.width || 0),
        height: Number(entry?.height || 0),
      }))
      .filter((entry) => isUsableImageCandidate(entry.url, entry))
      .filter((entry) => !excludeUrls.has(entry.url))
      .map((entry) => entry.url)[0] || null;

    if (firstImage) {
      IMAGE_SEARCH_CACHE.set(cacheKey, { value: firstImage, timestamp: Date.now() });
      logMediaDebug('CACHE_STORE', { label: 'openverse', key: cacheKey, ttlMs: SUCCESS_CACHE_TTL_MS });
      return firstImage;
    }
  } catch (e) {
    logMediaDebug('OPENVERSE_ERROR', { query: normalized, message: e?.message || 'request-failed', status: e?.response?.status || null });
  }

  IMAGE_SEARCH_CACHE.set(`${cacheKey}:failed`, { value: null, timestamp: Date.now() });
  return null;
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

const isPlaceholderMediaUrl = (value) => {
  const candidate = safeUrl(String(value || ''));
  return !candidate
    || /^data:image\/svg\+xml/i.test(candidate)
    || /via\.placeholder\.com|text=No\+Image|placeholder\.com|images\.unsplash\.com/i.test(candidate);
};

const extractMediaForTrend = async (trend, rawPostData, options = {}) => {
  if (trend && String(trend.source).toLowerCase() === 'reddit' && rawPostData) {
    const r = extractFromReddit(rawPostData);
    if (r.mediaType && r.mediaType !== 'none') return r;
  }

  const directImage = safeUrl(trend?.image || trend?.thumbnail);
  if (directImage && !isPlaceholderMediaUrl(directImage)) {
    return { image: directImage, video: '', thumbnail: directImage, mediaType: 'image' };
  }

  if (trend && trend.link) {
    const og = await fetchOpenGraphImage(trend.link).catch(() => null);
    if (og) {
      return { image: og, video: '', thumbnail: og, mediaType: 'image' };
    }
  }

  const queries = buildSearchQueries(trend);
  logMediaDebug('MEDIA_SEARCH_START', { title: trend?.title || '', queries });

  for (const query of queries) {
    const searched = await fetchWikimediaImage(query, options).catch(() => null)
      || await fetchOpenverseImage(query, options).catch(() => null);

    if (searched) {
      const sourceLabel = /wikimedia\.org/i.test(searched) ? 'wikimedia' : 'openverse';
      logMediaDebug('MEDIA_SEARCH_SUCCESS', { title: trend?.title || '', query, image: searched, source: sourceLabel });
      return { image: searched, video: '', thumbnail: searched, mediaType: 'image' };
    }

    logMediaDebug('MEDIA_SEARCH_SKIPPED', { title: trend?.title || '', query, reason: 'no-usable-source-result' });
  }

  logMediaDebug('MEDIA_FALLBACK_SVG', { title: trend?.title || '', reason: 'no-real-image-found' });
  const fallback = getFallbackThemeImage(trend);
  return { image: fallback, video: '', thumbnail: fallback, mediaType: 'image' };
};

module.exports = { extractMediaForTrend, extractFromReddit, getFallbackThemeImage, isPlaceholderMediaUrl, isUsableImageCandidate, buildSearchQueries };
