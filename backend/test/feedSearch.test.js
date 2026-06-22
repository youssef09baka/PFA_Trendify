const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTrendSearchQuery,
  calculateSearchRelevance
} = require('../controllers/feedController');

test('feed search builds a Mongo query across persistent trend fields', () => {
  const query = buildTrendSearchQuery('GTA 6');

  assert.ok(query);
  assert.equal(Array.isArray(query.$or), true);
  assert.equal(query.$or.length, 5);
  assert.deepEqual(
    query.$or.map((entry) => Object.keys(entry)[0]),
    ['title', 'tags', 'category', 'excerpt', 'link']
  );
});

test('feed search ranks direct subject match above unrelated high-score trend', () => {
  const gtaTrend = {
    title: 'GTA 6 gameplay trailer expected before launch',
    category: 'Gaming',
    tags: ['Rockstar', 'Gaming'],
    score: 42
  };
  const unrelatedTrend = {
    title: 'Memorial Day 2026',
    category: 'Search Trends',
    tags: ['Holiday'],
    score: 99
  };

  assert.ok(
    calculateSearchRelevance(gtaTrend, 'GTA 6') > calculateSearchRelevance(unrelatedTrend, 'GTA 6'),
    'search relevance must beat unrelated raw score'
  );
  assert.equal(calculateSearchRelevance(unrelatedTrend, 'GTA 6'), 0);
});
