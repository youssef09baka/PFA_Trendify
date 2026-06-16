const { classifyTrendPotential } = require("./potentialClassifier");

const ALLOWED_PREDICTIONS = ['HIGH', 'LOW', 'UNAVAILABLE'];

const normalizePredictionValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null) {
    if (typeof value.classification === 'string') return value.classification.trim().toUpperCase();
    if (typeof value.ml_prediction === 'string') return value.ml_prediction.trim().toUpperCase();
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === '1') return 'HIGH';
    if (normalized === '0') return 'LOW';
    return normalized;
  }
  return null;
};

const resolvePredictionValue = (value, trend = {}) => {
  const normalized = normalizePredictionValue(value);

  if (normalized === null) {
    if (typeof trend.score === 'number' && !Number.isNaN(trend.score)) {
      return classifyTrendPotential(trend).classification;
    }
    return null;
  }

  if (!ALLOWED_PREDICTIONS.includes(normalized)) {
    if (typeof trend.score === 'number' && !Number.isNaN(trend.score)) {
      return classifyTrendPotential(trend).classification;
    }
    return normalized;
  }

  if (normalized === 'UNKNOWN') {
    if (typeof trend.score === 'number' && !Number.isNaN(trend.score)) {
      return classifyTrendPotential(trend).classification;
    }
    return 'UNAVAILABLE';
  }

  return normalized;
};

/**
 * Predict trend potential using score-based classifier
 * 
 * This replaces the external ML service with an internal classifier
 * that uses verified thresholds based on real production data:
 * - HIGH:        score >= 70 (top tier)
 * - LOW:         score < 70 (bottom tier)
 * - UNAVAILABLE: null/undefined/NaN/invalid score
 * 
 * @param {Object} trend - Trend object with score field
 * @returns {Object} Prediction object with classification, confidence, reasoning
 */
const predictTrend = async (trend) => {
  if (!trend || typeof trend.score !== 'number' || isNaN(trend.score)) {
    return {
      classification: 'UNAVAILABLE',
      confidence: 0.0,
      reasoning: ['Invalid trend data'],
      explanation: 'Cannot predict: missing or invalid score field'
    };
  }

  return classifyTrendPotential(trend);
};

module.exports = { predictTrend, normalizePredictionValue, resolvePredictionValue };