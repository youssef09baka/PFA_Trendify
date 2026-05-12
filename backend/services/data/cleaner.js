const BAD_PATTERNS = [
  "sexual",
  "kill",
  "murder",
  "graphic",
  "violence",
  "suicide",
  "terrorist",
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
};