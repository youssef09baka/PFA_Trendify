const crypto = require('crypto');
const { isPlaceholderMediaUrl } = require('./mediaExtractor');

const normalizeMediaValue = (value) => {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/&amp;/g, '&')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
};

const createMediaHash = (value) => {
  const normalized = normalizeMediaValue(value);
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const extractKeywords = (value) => {
  const words = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !['google', 'trends', 'reddit', 'news', 'the', 'and', 'for', 'with', 'that', 'this'].includes(word));

  return [...new Set(words)].slice(0, 8);
};

const areTrendsRelated = (left, right) => {
  if (!left || !right) return false;

  const leftKeywords = extractKeywords(left.title || '');
  const rightKeywords = extractKeywords(right.title || '');
  const sharedKeywords = leftKeywords.filter((keyword) => rightKeywords.includes(keyword));

  const sameSlug = String(left.slug || '').toLowerCase() === String(right.slug || '').toLowerCase();

  return sameSlug || sharedKeywords.length >= 2;
};

const computeMediaFingerprint = (trend) => {
  const primary = normalizeMediaValue(trend?.image || trend?.thumbnail || trend?.poster || '');
  const fallback = normalizeMediaValue(trend?.image || trend?.thumbnail || '');
  const hash = createMediaHash(primary || fallback || trend?.title || '');
  return {
    fingerprint: hash || 'none',
    primaryUrl: primary,
    fallbackUrl: fallback,
    hasPlaceholder: isPlaceholderMediaUrl(trend?.image || trend?.thumbnail || ''),
    keywords: extractKeywords(trend?.title || ''),
    category: String(trend?.category || '').trim(),
    source: String(trend?.source || '').trim(),
  };
};

const findDuplicateMediaCandidates = (trends = []) => {
  const groups = new Map();

  for (const trend of trends) {
    const { fingerprint, primaryUrl, hasPlaceholder } = computeMediaFingerprint(trend);
    if (!fingerprint || fingerprint === 'none') continue;

    if (!groups.has(fingerprint)) groups.set(fingerprint, []);
    groups.get(fingerprint).push({ trend, fingerprint, primaryUrl, hasPlaceholder });
  }

  const candidates = [];

  for (const [fingerprint, items] of groups.entries()) {
    if (items.length < 2) continue;

    for (let index = 0; index < items.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < items.length; otherIndex += 1) {
        const left = items[index];
        const right = items[otherIndex];

        if (areTrendsRelated(left.trend, right.trend)) continue;

        candidates.push({ fingerprint, left: left.trend, right: right.trend });
      }
    }
  }

  return candidates;
};

module.exports = {
  computeMediaFingerprint,
  createMediaHash,
  findDuplicateMediaCandidates,
  areTrendsRelated,
  normalizeMediaValue,
};
