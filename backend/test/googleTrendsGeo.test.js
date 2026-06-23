const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeGeoInterest, extractGoogleTrendsQuery } = require('../services/data/googleTrendsService');

test('google trends geo interest keeps only real region records', () => {
  const geoInterest = normalizeGeoInterest([
    { geo: 'US', location: 'United States', value: '100', extracted_value: 100 },
    { geo: 'CA', location: 'Canada', value: '54', extracted_value: 54 },
    { geoCode: 'GB', geoName: 'United Kingdom', value: [42] },
    { geo: '', location: 'Unknown', value: '80', extracted_value: 80 },
    { geo: 'WORLD', location: 'World', value: '12', extracted_value: 12 },
    { geo: 'FR', location: 'France', value: '0', extracted_value: 0 }
  ]);

  assert.deepEqual(geoInterest, [
    { country: 'United States', countryCode: 'US', value: 100 },
    { country: 'Canada', countryCode: 'CA', value: 54 },
    { country: 'United Kingdom', countryCode: 'GB', value: 42 }
  ]);
});

test('google trends query is extracted from source link', () => {
  const query = extractGoogleTrendsQuery('https://trends.google.com/trends/explore?q=Meta%20Glasses&geo=US');

  assert.equal(query, 'Meta Glasses');
});
