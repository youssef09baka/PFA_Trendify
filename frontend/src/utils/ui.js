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
