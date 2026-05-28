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
