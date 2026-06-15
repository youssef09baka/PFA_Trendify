const { classifyTrendPotential } = require("./potentialClassifier");

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

  // Use the classifier to predict potential
  const prediction = classifyTrendPotential(trend);
  
  return prediction;
};

module.exports = { predictTrend };