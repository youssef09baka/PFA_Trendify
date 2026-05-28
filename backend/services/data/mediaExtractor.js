const axios = require('axios');
const { URL } = require('url');

const IMAGE_SEARCH_CACHE = new Map();
const FALLBACK_IMAGE_CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const DDG_REQUEST_TIMEOUT_MS = 30000;
const DDG_RETRY_ATTEMPTS = 2;
const DDG_REQUEST_DELAY_MS = 450;

const logMediaDebug = (stage, details) => {
  console.info(`[MEDIA-DEBUG] ${stage}`, details);
};

const isUsableImageCandidate = (value) => typeof value === 'string' && /^https?:\/\//.test(value) && !/\.svg$/i.test(value);

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
  ferrari: ['Ferrari luxury sports car', 'Ferrari automotive editorial', 'Ferrari car front view'],
  tesla: ['Tesla electric vehicle', 'Tesla EV car', 'Tesla automotive editorial'],
  chipotle: ['Chipotle restaurant food', 'Chipotle burrito bowl', 'Chipotle food photography'],
  usps: ['USPS postal delivery mail truck', 'USPS mail carrier vehicle', 'USPS delivery logistics'],
  nba: ['NBA basketball finals', 'NBA basketball game', 'NBA basketball arena'],
  amazon: ['Amazon delivery logistics', 'Amazon warehouse fulfillment'],
  apple: ['Apple product launch', 'Apple technology device'],
  microsoft: ['Microsoft cloud technology', 'Microsoft software product'],
  google: ['Google technology product', 'Google AI platform'],
  openai: ['OpenAI AI model', 'OpenAI technology'],
  meta: ['Meta social platform', 'Meta AI technology']
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

  const queries = [
    title,
    title && category && title !== category ? `${title} ${category}` : '',
    keywordPhrase ? `${keywordPhrase} ${semanticCategory}` : '',
    keywordPhrase ? `${keywordPhrase} editorial photo` : '',
    keywordPhrase ? `${keywordPhrase} real visual` : '',
    entityBoost[0] || '',
    entityBoost[1] || '',
    entityBoost[2] || '',
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

const getFallbackThemeImage = (trend) => {
  const categoryKey = inferFallbackCategory(trend);
  const palette = FALLBACK_THEME_IMAGES[categoryKey] || FALLBACK_THEME_IMAGES.default;

  const query = normalizeQuery([trend?.title, trend?.category, trend?.source_detail || trend?.source].filter(Boolean).join(' '));
  const cacheKey = `${query}|${trend?._id || trend?.slug || trend?.title || 'trend'}`;
  const cached = FALLBACK_IMAGE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  const choice = palette[simpleHash(`${cacheKey}|${trend?.category || ''}|${trend?.source || ''}`) % palette.length];
  FALLBACK_IMAGE_CACHE.set(cacheKey, { value: choice, timestamp: Date.now() });
  return choice;
};

const getBrowserLikeHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://duckduckgo.com/',
  'X-Requested-With': 'XMLHttpRequest',
  'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A.Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchDuckDuckGoImage = async (query) => {
  const normalized = normalizeQuery(query);
  logMediaDebug('DDG_START', { query: normalized });

  if (!normalized) {
    logMediaDebug('DDG_SKIPPED', { reason: 'empty-query', query: normalized });
    return null;
  }

  const cached = IMAGE_SEARCH_CACHE.get(`ddg:${normalized}`);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  const headers = getBrowserLikeHeaders();
  const url = `https://duckduckgo.com/i.js?o=json&l=en&q=${encodeURIComponent(normalized)}&p=1&vqd=1`;

  await sleep(DDG_REQUEST_DELAY_MS);

  for (let attempt = 1; attempt <= DDG_RETRY_ATTEMPTS; attempt += 1) {
    try {
      logMediaDebug('DDG_REQUEST_EXECUTED', { query: normalized, attempt, url, headers });
      const res = await axios.get(url, {
        timeout: DDG_REQUEST_TIMEOUT_MS,
        headers,
        maxRedirects: 3,
        validateStatus: (status) => status >= 200 && status < 500,
      });

      const results = Array.isArray(res.data?.results) ? res.data.results : [];
      logMediaDebug('DDG_RESPONSE', {
        query: normalized,
        attempt,
        status: res.status,
        resultsCount: results.length,
        timeoutMs: DDG_REQUEST_TIMEOUT_MS,
        headersUsed: headers,
      });

      const firstImage = results.find((entry) => isUsableImageCandidate(entry?.image))?.image
        || results.find((entry) => isUsableImageCandidate(entry?.thumbnail))?.thumbnail
        || results.find((entry) => isUsableImageCandidate(entry?.url))?.url;

      if (!results.length) {
        logMediaDebug('DDG_EMPTY_RESULTS', { query: normalized, attempt, reason: 'no-results' });
        if (attempt < DDG_RETRY_ATTEMPTS) {
          await sleep(DDG_REQUEST_DELAY_MS * attempt);
          continue;
        }
        IMAGE_SEARCH_CACHE.set(`ddg:${normalized}`, { value: null, timestamp: Date.now() });
        return null;
      }

      if (!isUsableImageCandidate(firstImage)) {
        logMediaDebug('DDG_REJECTED', { query: normalized, attempt, candidate: firstImage, reason: 'invalid-candidate' });
        if (attempt < DDG_RETRY_ATTEMPTS) {
          await sleep(DDG_REQUEST_DELAY_MS * attempt);
          continue;
        }
        IMAGE_SEARCH_CACHE.set(`ddg:${normalized}`, { value: null, timestamp: Date.now() });
        return null;
      }

      logMediaDebug('DDG_ACCEPTED', { query: normalized, attempt, image: firstImage });
      IMAGE_SEARCH_CACHE.set(`ddg:${normalized}`, { value: firstImage, timestamp: Date.now() });
      return firstImage;
    } catch (e) {
      const status = e?.response?.status || null;
      const timeout = e?.code === 'ECONNABORTED' || e?.message?.includes('timeout');
      logMediaDebug('DDG_ERROR', {
        query: normalized,
        attempt,
        status,
        timeout,
        message: e?.message || 'unknown-error',
        reason: timeout ? 'timeout' : 'request-failed',
      });

      if (attempt < DDG_RETRY_ATTEMPTS) {
        await sleep(DDG_REQUEST_DELAY_MS * attempt);
        continue;
      }
    }
  }

  IMAGE_SEARCH_CACHE.set(`ddg:${normalized}`, { value: null, timestamp: Date.now() });
  return null;
};

const fetchSerpApiImage = async (query) => {
  const normalized = normalizeQuery(query);
  if (!normalized || !SERPAPI_KEY) return null;

  const cached = IMAGE_SEARCH_CACHE.get(`serp:${normalized}`);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: { engine: 'google_images', q: normalized, api_key: SERPAPI_KEY, tbm: 'isch' },
      timeout: 8000,
      headers: { 'User-Agent': 'PFA-Feed/1.0' }
    });

    const firstImage = res.data?.images_results?.find((entry) => typeof entry?.original === 'string' && /^https?:\/\//.test(entry.original))?.original
      || res.data?.images_results?.find((entry) => typeof entry?.thumbnail === 'string' && /^https?:\/\//.test(entry.thumbnail))?.thumbnail;

    if (firstImage) {
      IMAGE_SEARCH_CACHE.set(`serp:${normalized}`, { value: firstImage, timestamp: Date.now() });
      return firstImage;
    }
  } catch (e) {
    // ignore and continue to Wikimedia
  }

  IMAGE_SEARCH_CACHE.set(`serp:${normalized}`, { value: null, timestamp: Date.now() });
  return null;
};

const fetchWikimediaImage = async (query) => {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  const cached = IMAGE_SEARCH_CACHE.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(normalized)}&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`;
    const res = await axios.get(url, { timeout: 6000, headers: { 'User-Agent': 'PFA-Feed/1.0' } });
    const pages = res.data?.query?.pages || {};
    const firstImage = Object.values(pages)
      .map((entry) => entry?.imageinfo?.[0]?.url || entry?.thumbnail?.source)
      .find((value) => typeof value === 'string' && /^https?:\/\//.test(value));

    if (firstImage) {
      IMAGE_SEARCH_CACHE.set(normalized, { value: firstImage, timestamp: Date.now() });
      return firstImage;
    }
  } catch (e) {
    // ignore search failures and rely on fallback image
  }

  IMAGE_SEARCH_CACHE.set(normalized, { value: null, timestamp: Date.now() });
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
  return !candidate || /via\.placeholder\.com|text=No\+Image|placeholder\.com/i.test(candidate);
};

const extractMediaForTrend = async (trend, rawPostData) => {
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
    const searched = await fetchDuckDuckGoImage(query).catch(() => null)
      || await fetchSerpApiImage(query).catch(() => null)
      || await fetchWikimediaImage(query).catch(() => null);
    if (searched) {
      logMediaDebug('MEDIA_SEARCH_SUCCESS', { title: trend?.title || '', query, image: searched });
      return { image: searched, video: '', thumbnail: searched, mediaType: 'image' };
    }
  }

  logMediaDebug('MEDIA_FALLBACK_SVG', { title: trend?.title || '', reason: 'no-real-image-found' });
  const fallback = getFallbackThemeImage(trend);
  return { image: fallback, video: '', thumbnail: fallback, mediaType: 'image' };
};

module.exports = { extractMediaForTrend, extractFromReddit, getFallbackThemeImage, isPlaceholderMediaUrl, buildSearchQueries };
