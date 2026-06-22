const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractTopicTerms,
  calculateTrendRelevance,
  sanitizePublicAnswer
} = require('../services/assistantService');

test('assistant extracts specific subject from user search intent', () => {
  const topic = extractTopicTerms('Je veux savoir la derniere tendance sur GTA 6');

  assert.equal(topic.hasTopic, true);
  assert.equal(topic.phrase, 'gta 6');
  assert.ok(topic.terms.includes('gta'));
  assert.ok(topic.terms.includes('6'));
});

test('assistant ranks matching trend above unrelated high-score trend', () => {
  const topic = extractTopicTerms('Je veux savoir la derniere tendance sur GTA 6');
  const gtaTrend = {
    title: 'GTA 6 trailer date and gameplay leaks',
    category: 'Gaming',
    score: 45
  };
  const unrelatedTrend = {
    title: 'Memorial Day 2026',
    category: 'Search Trends',
    score: 99
  };

  assert.ok(
    calculateTrendRelevance(gtaTrend, topic) > calculateTrendRelevance(unrelatedTrend, topic),
    'subject relevance must beat unrelated raw score'
  );
  assert.ok(calculateTrendRelevance(unrelatedTrend, topic) < 8);
});

test('assistant treats business as topic only when asked as trend domain', () => {
  const ideaRequest = extractTopicTerms('Donne moi des idees business');
  const domainRequest = extractTopicTerms('Quelles sont les tendances business');

  assert.equal(ideaRequest.hasTopic, false);
  assert.equal(domainRequest.hasTopic, true);
  assert.ok(domainRequest.terms.includes('business'));
});

test('assistant public sanitizer removes technical terms', () => {
  const answer = sanitizePublicAnswer('MongoDB API backend collection score 3500000');

  assert.equal(/MongoDB|API|backend|collection|score/i.test(answer), false);
});
