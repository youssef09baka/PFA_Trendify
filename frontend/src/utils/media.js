// REMOVED: All generic Unsplash fallback images permanently disabled
// Only real, relevant images are displayed - no fallback placeholders

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
  return (
    !url
    || /via\.placeholder\.com|text=No\+Image|placeholder\.com/i.test(url)
    || /^data:image\/svg\+xml/i.test(url)
    || /images\.unsplash\.com/i.test(url)  // Generic Unsplash fallback images
  );
};

const simpleHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

// REMOVED: getFallbackThemeImage() - No generic fallback images used
// Only real, relevant images are displayed

export const getCardMediaUrl = (trend = {}) => {
  const candidates = [trend.image, trend.thumbnail, trend.poster].map(normalizeMediaUrl).filter(Boolean);

  const richCandidate = candidates.find((url) => !isPlaceholderMedia(url));
  if (richCandidate) return richCandidate;

  // No generic fallback - return empty if no real image found
  // Option 1: MediaBox will return null for no-image trends
  return '';
};
