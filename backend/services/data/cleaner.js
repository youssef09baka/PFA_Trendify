const BAD_PATTERNS = [
  "sexual",
  "kill",
  "murder",
  "graphic",
  "violence",
  "suicide",
  "terrorist",
];

const POSITIVE_TERMS = [
  "growth",
  "rise",
  "gain",
  "boom",
  "surge",
  "win",
  "success",
  "momentum",
  "innov",
  "good",
  "positive",
  "strong",
  "breakthrough",
];

const NEGATIVE_TERMS = [
  "drop",
  "decline",
  "risk",
  "loss",
  "fail",
  "problem",
  "crash",
  "scandal",
  "bad",
  "negative",
  "attack",
  "ban",
  "lawsuit",
];

const cleanTitle = (title) => {
  if (!title) return null;

  return title
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
};

const isGoodContent = (title) => {
  if (!title) return false;

  const lower = title.toLowerCase();

  return !BAD_PATTERNS.some((p) => lower.includes(p));
};

const estimateSentimentScore = (text) => {
  if (!text) return 0;

  const lower = text.toLowerCase();

  const positive = POSITIVE_TERMS.reduce(
    (count, term) => count + (lower.includes(term) ? 1 : 0),
    0
  );
  const negative = NEGATIVE_TERMS.reduce(
    (count, term) => count + (lower.includes(term) ? 1 : 0),
    0
  );

  if (positive + negative === 0) return 0;

  const score = (positive - negative) / (positive + negative);
  return Number(score.toFixed(3));
};

const validateTrend = (trend) => {
  return (
    trend &&
    typeof trend.title === "string" &&
    typeof trend.popularity === "number" &&
    typeof trend.growth === "number" &&
    typeof trend.source === "string" &&
    typeof trend.link === "string"
  );
};

module.exports = {
  cleanTitle,
  isGoodContent,
  validateTrend,
  estimateSentimentScore,
};