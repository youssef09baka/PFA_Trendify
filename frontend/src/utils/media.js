const FALLBACK_THEME_IMAGES = {
  tech: [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80'
  ],
  ai: [
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80'
  ],
  business: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'
  ],
  finance: [
    'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80'
  ],
  science: [
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1535704882198-7f6a4d7f92d1?auto=format&fit=crop&w=1200&q=80'
  ],
  culture: [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
  ],
  default: [
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80'
  ],
};

export const normalizeMediaUrl = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim().replace(/^"|"$/g, '').replace(/&amp;/g, '&');
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  return trimmed;
};

export const isPlaceholderMedia = (value) => {
  const url = normalizeMediaUrl(value);
  return !url || /via\.placeholder\.com|text=No\+Image|placeholder\.com/i.test(url);
};

const simpleHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

export const getFallbackThemeImage = (trend = {}) => {
  const text = `${trend.category || ''} ${trend.title || ''} ${trend.source || ''}`.toLowerCase();
  const palette = /ai|tech|gpt|llm|robot|automation|software|data/.test(text)
    ? FALLBACK_THEME_IMAGES.ai
    : /finance|crypto|stock|market|investment|economy|bank/.test(text)
      ? FALLBACK_THEME_IMAGES.finance
      : /science|health|research|biology|climate|space/.test(text)
        ? FALLBACK_THEME_IMAGES.science
        : /business|startup|founder|launch|strategy/.test(text)
          ? FALLBACK_THEME_IMAGES.business
          : /social|culture|movie|music|entertainment|game/.test(text)
            ? FALLBACK_THEME_IMAGES.culture
            : FALLBACK_THEME_IMAGES.default;

  const key = `${trend.title || ''}|${trend.category || ''}|${trend.source || ''}`;
  return palette[simpleHash(key) % palette.length];
};

export const getCardMediaUrl = (trend = {}) => {
  const candidates = [trend.image, trend.thumbnail, trend.poster].map(normalizeMediaUrl).filter(Boolean);

  const richCandidate = candidates.find((url) => !isPlaceholderMedia(url));
  if (richCandidate) return richCandidate;

  return getFallbackThemeImage(trend);
};
