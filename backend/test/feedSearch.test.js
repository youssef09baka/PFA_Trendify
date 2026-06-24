const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTrendSearchQuery,
  calculateSearchRelevance,
  getFeedCategoryDefinition,
  trendMatchesFeedCategory
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

test('feed search avoids short AI token matches inside unrelated words', () => {
  const query = buildTrendSearchQuery('AI');
  const titleRegex = query.$or.find((entry) => entry.title)?.title;

  assert.equal(titleRegex.test('OpenAI launches new model'), false);
  assert.equal(titleRegex.test('AI launches new model'), true);
  assert.equal(titleRegex.test('DeAaron Fox fouls Shai GilgeousAlexander'), false);
  assert.equal(titleRegex.test('Finnish president says Ukraine position is best since war began'), false);
  assert.equal(calculateSearchRelevance({ title: 'AI launches new model', tags: ['AI'] }, 'AI') > 0, true);
  assert.equal(calculateSearchRelevance({ title: 'Shai GilgeousAlexander injury update', tags: [] }, 'AI'), 0);
});

test('feed semantic categories match title tags and original category', () => {
  const football = getFeedCategoryDefinition('football');
  const gaming = getFeedCategoryDefinition('gaming');
  const crypto = getFeedCategoryDefinition('crypto');
  const ia = getFeedCategoryDefinition('ia');

  assert.ok(trendMatchesFeedCategory({
    title: 'UEFA Champions League final dominates searches',
    category: 'Discussion',
    tags: ['sports']
  }, football));

  assert.ok(trendMatchesFeedCategory({
    title: 'GTA 6 trailer rumors accelerate',
    category: 'Search Trends',
    tags: ['Rockstar']
  }, gaming));

  assert.ok(trendMatchesFeedCategory({
    title: 'Bitcoin and Solana rebound after market correction',
    category: 'Discussion',
    tags: ['finance']
  }, crypto));

  assert.ok(trendMatchesFeedCategory({
    title: 'OpenAI launches new assistant features',
    category: 'Tech',
    tags: ['software']
  }, ia));
});

test('feed semantic categories avoid broad partial matches', () => {
  const ia = getFeedCategoryDefinition('ia');
  const football = getFeedCategoryDefinition('football');
  const social = getFeedCategoryDefinition('social');

  assert.equal(trendMatchesFeedCategory({
    title: 'Daily holiday shopping discussion',
    category: 'Discussion',
    tags: ['community']
  }, ia), false);

  assert.equal(trendMatchesFeedCategory({
    title: 'Legal reforms dominate international news',
    category: 'Actualités',
    tags: ['politics']
  }, football), false);

  assert.equal(trendMatchesFeedCategory({
    title: 'Xbox showcase reveals new games',
    category: 'Gaming',
    tags: ['console']
  }, social), false);
});
