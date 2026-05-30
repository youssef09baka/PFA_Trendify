const axios = require("axios");
const { ML_SERVICE_URL } = require("../config/config");
const { generateMlFeatures } = require("./featureGenerator");

const normalizeMlPrediction = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "1" || normalized === "high" || normalized.includes("high")) {
    return "HIGH";
  }

  if (normalized === "0" || normalized === "low" || normalized.includes("low")) {
    return "LOW";
  }

  if (normalized === "medium" || normalized.includes("medium")) {
    return "UNAVAILABLE";
  }

  return "UNAVAILABLE";
};

const isRedditSource = (trend) =>
  String(trend?.source || "").toLowerCase().includes("reddit");

const predictTrend = async (trend) => {
  if (!isRedditSource(trend)) {
    return null;
  }

  const requiredFields = [
    "num_comments",
    "post_length",
    "hour",
    "title_length",
    "sentiment"
  ];

  const normalizedTrend = generateMlFeatures(trend);
  const hasNumericInputs = requiredFields.every(
    (field) => typeof normalizedTrend[field] === "number"
  );

  if (!hasNumericInputs) {
    return "UNAVAILABLE";
  }

  try {
    const response = await axios.post(ML_SERVICE_URL, {
      num_comments: normalizedTrend.num_comments,
      post_length: normalizedTrend.post_length,
      hour: normalizedTrend.hour,
      title_length: normalizedTrend.title_length,
      sentiment: normalizedTrend.sentiment
    }, {
      timeout: 8000
    });

    return normalizeMlPrediction(response.data?.prediction ?? "UNAVAILABLE");
  } catch (error) {
    console.warn(`[ML] prediction failed for trend "${trend.title}": ${error.message}`);
    return "UNAVAILABLE";
  }
};

module.exports = { predictTrend };