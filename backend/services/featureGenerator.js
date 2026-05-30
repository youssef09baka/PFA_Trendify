const { estimateSentimentScore } = require("./data/cleaner");

const toFiniteNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeHour = (value, fallbackDate) => {
  const num = toFiniteNumber(value, NaN);
  if (Number.isFinite(num) && num >= 0 && num <= 23) return Math.floor(num);

  const date = fallbackDate ? new Date(fallbackDate) : new Date();
  if (!Number.isFinite(date.getTime())) return new Date().getUTCHours();
  return date.getUTCHours();
};

const normalizeTitle = (trend) => {
  if (typeof trend.title === "string" && trend.title.trim()) return trend.title.trim();
  if (typeof trend.query === "string" && trend.query.trim()) return trend.query.trim();
  if (typeof trend.excerpt === "string" && trend.excerpt.trim()) return trend.excerpt.trim();
  return "";
};

const normalizePostLength = (trend, title) => {
  const raw = toFiniteNumber(trend.post_length, NaN);
  if (Number.isFinite(raw) && raw >= 0) return raw;

  const excerpt = typeof trend.excerpt === "string" ? trend.excerpt.trim() : "";
  if (excerpt.length > 0) return excerpt.length;

  return title.length;
};

const normalizeTitleLength = (title) => {
  const raw = toFiniteNumber(title.length, NaN);
  return Number.isFinite(raw) ? raw : 0;
};

const normalizeNumComments = (trend) => {
  const raw = toFiniteNumber(trend.num_comments, 0);
  return Math.max(0, raw);
};

const normalizeSentiment = (trend, title) => {
  if (typeof trend.sentiment === "number" && Number.isFinite(trend.sentiment)) {
    return trend.sentiment;
  }

  const text = title || (typeof trend.excerpt === "string" ? trend.excerpt : "") || (typeof trend.query === "string" ? trend.query : "");
  return estimateSentimentScore(text);
};

const generateMlFeatures = (trend = {}) => {
  const title = normalizeTitle(trend);
  const post_length = normalizePostLength(trend, title);
  const title_length = normalizeTitleLength(title);
  const sentiment = normalizeSentiment(trend, title);
  const hour = normalizeHour(trend.hour, trend.fetchedAt || trend.createdAt || trend.updatedAt || trend.savedAt);
  const num_comments = normalizeNumComments(trend);

  return {
    ...trend,
    title,
    num_comments,
    post_length,
    hour,
    title_length,
    sentiment
  };
};

module.exports = {
  generateMlFeatures,
  normalizeHour,
  normalizePostLength,
  normalizeNumComments,
  normalizeTitleLength,
  normalizeSentiment
};
