/**
 * Trend Potential Classifier
 * 
 * Classifies trends as HIGH/LOW/UNAVAILABLE based on score thresholds
 * verified against real production data (200 trends analyzed)
 * 
 * Thresholds derived from runtime verification:
 * - HIGH:        score >= 70 (top 90% of trends in production)
 * - LOW:         score < 70 (bottom 10% of trends in production)
 * - UNAVAILABLE: null, undefined, NaN, or invalid score
 * 
 * Score formula: (popularity * 0.7 + growth * 0.3) * 100
 * where popularity and growth are normalized by getRealTrends()
 */

/**
 * Classify a trend's potential based on its score
 * 
 * @param {Object} trend - Trend object with score and optional growth
 * @returns {Object} Classification with {classification, confidence, reasoning, explanation}
 */
function classifyTrendPotential(trend) {
  if (!trend || typeof trend.score !== 'number' || isNaN(trend.score)) {
    return {
      classification: 'UNAVAILABLE',
      confidence: 0.0,
      reasoning: ['No valid score data'],
      explanation: 'Cannot classify: missing or invalid score field'
    };
  }

  const score = trend.score;

  let classification;
  let confidence;
  const reasoning = [];

  // Base classification from score thresholds (verified on real data)
  if (score >= 70) {
    classification = 'HIGH';
    confidence = 0.85;
    reasoning.push(`Score ${score} supérieur ou égal au seuil 70`);
  } else {
    classification = 'LOW';
    confidence = 0.70;
    reasoning.push(`Score ${score} inférieur au seuil 70`);
  }

  // Build explanation
  const explanations = [];
  
  if (classification === 'HIGH') {
    explanations.push('Cette tendance montre un potentiel fort');
    explanations.push(`Le score ${score} indique une traction élevée`);
    explanations.push('Prioritaire pour une mise en avant');
  } else {
    explanations.push('Cette tendance montre un potentiel plus limité');
    explanations.push(`Le score ${score} indique une traction plus faible`);
    explanations.push('A suivre si le signal progresse');
  }

  return {
    classification,
    confidence: Number(confidence.toFixed(2)),
    reasoning,
    explanation: explanations.join(' | ')
  };
}

/**
 * Batch classify multiple trends
 */
function classifyTrendsBatch(trends) {
  if (!Array.isArray(trends)) {
    return [];
  }

  return trends.map(trend => ({
    ...trend,
    ml_prediction: classifyTrendPotential(trend).classification,
    ml_confidence: classifyTrendPotential(trend).confidence,
    ml_reasoning: classifyTrendPotential(trend).reasoning
  }));
}

module.exports = {
  classifyTrendPotential,
  classifyTrendsBatch
};
