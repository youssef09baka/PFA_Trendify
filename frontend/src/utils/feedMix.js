const FEED_SEEN_KEY = 'feed-seen-trends';
const MAX_SEEN_ITEMS = 120;

export const getSeenTrendIds = () => {
  try {
    const raw = localStorage.getItem(FEED_SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const rememberTrendView = (id) => {
  if (!id) return;
  try {
    const current = getSeenTrendIds();
    const next = [String(id), ...current.filter((value) => value !== String(id))].slice(0, MAX_SEEN_ITEMS);
    localStorage.setItem(FEED_SEEN_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
};

const getTrendAgeHours = (trend) => {
  const sourceTime = trend.fetchedAt || trend.createdAt || trend.updatedAt;
  if (!sourceTime) return 0;
  return Math.max(0, (Date.now() - new Date(sourceTime).getTime()) / (1000 * 60 * 60));
};

export const applyFeedMix = (items = [], seenIds = []) => {
  const visibleSeen = Array.isArray(seenIds) ? seenIds.map(String) : getSeenTrendIds();
  const runtimeNoise = Math.random() * 0.18;

  const mixed = (items || [])
    .map((trend) => {
      const ageHours = getTrendAgeHours(trend);
      const freshnessBoost = Math.max(0, 6 - ageHours * 0.18);
      const unseenBoost = visibleSeen.includes(String(trend._id || trend.id || trend.slug || trend.title)) ? 0 : 1.8;
      const hashFactor = (Math.abs(String(trend.title || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 11) * 0.03;
      const randomFactor = hashFactor + runtimeNoise;
      const mixedScore = Number(trend.score || 0) + freshnessBoost + unseenBoost + randomFactor;

      return {
        ...trend,
        freshnessBoost,
        unseenBoost,
        randomFactor,
        mixedScore
      };
    })
    .sort((a, b) => b.mixedScore - a.mixedScore || Number(b.score || 0) - Number(a.score || 0));

  console.info('[FEED-MIX-FRONT] runtime', {
    runtimeNoise,
    top: mixed.slice(0, 6).map((entry) => ({ id: entry._id || entry.id || entry.slug, score: entry.score, mixedScore: entry.mixedScore, randomFactor: entry.randomFactor }))
  });

  return mixed;
};
