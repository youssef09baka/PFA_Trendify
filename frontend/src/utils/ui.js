export const scoreColor = (s) => {
  if (s >= 90) return 'var(--y)';
  if (s >= 80) return 'var(--b)';
  return 'var(--g)';
};

export const catTag = (cat) => {
  const map = {
    tech: 'tag-y',
    gaming: 'tag-b',
    business: 'tag-g',
    health: 'tag-p',
    education: 'tag-b',
    society: 'tag-g'
  };
  return map[cat] || 'tag-g';
};

export function formatScore(value) {
  if (value === null || value === undefined) return '–';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);

  let score = n;
  // If backend returns 0..1, scale to 0..100
  if (score > 0 && score <= 1) score = Math.round(score * 100);
  // If backend returns >100 (raw metric), clamp to 100 to avoid RPG/EXP feeling
  if (score > 100) score = 100;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return `${score}/100`;
}

export function isTechnicalRedditSummary(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  return /^submitted by\s+\/?u\//i.test(text) || /\[link\]\s*\[comments\]/i.test(text);
}

export function cleanTrendText(value) {
  const text = String(value || '').trim();
  if (!text || isTechnicalRedditSummary(text) || /ai unavailable/i.test(text)) {
    return '';
  }
  return text;
}

export function getTrendSummary(trend, fallback = '') {
  const candidates = [trend?.excerpt, trend?.summary, trend?.description];
  for (const candidate of candidates) {
    const cleaned = cleanTrendText(candidate);
    if (cleaned) return cleaned;
  }
  return fallback;
}
