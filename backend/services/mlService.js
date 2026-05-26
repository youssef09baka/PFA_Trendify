const axios = require("axios");
const { ML_SERVICE_URL } = require("../config/config");

const predictTrend = async (trend) => {
  const requiredFields = [
    "num_comments",
    "post_length",
    "hour",
    "title_length",
    "sentiment"
  ];

  const hasNumericInputs = requiredFields.every(
    (field) => typeof trend[field] === "number"
  );
  if (!hasNumericInputs) {
    return "UNKNOWN";
  }

  try {
    const response = await axios.post(ML_SERVICE_URL, {
      num_comments: trend.num_comments,
      post_length: trend.post_length,
      hour: trend.hour,
      title_length: trend.title_length,
      sentiment: trend.sentiment
    }, {
      timeout: 8000
    });

    return response.data?.prediction ?? "UNKNOWN";
  } catch (error) {
    console.warn(`[ML] prediction failed for trend "${trend.title}": ${error.message}`);
    return "UNKNOWN";
  }
};

module.exports = { predictTrend };