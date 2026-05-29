const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_INTERVAL_MS } = require('../services/feedSync');

test('scheduler default interval is 60 minutes', () => {
  assert.equal(DEFAULT_INTERVAL_MS, 60 * 60 * 1000);
});
