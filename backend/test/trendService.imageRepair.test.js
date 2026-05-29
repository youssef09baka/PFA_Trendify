const test = require('node:test');
const assert = require('node:assert/strict');

const withStubbedTrendModel = async () => {
  const originalTrendModel = require.cache[require.resolve('../models/Trend')];
  const originalTrendService = require.cache[require.resolve('../services/trendService')];
  const originalMediaExtractor = require.cache[require.resolve('../services/data/mediaExtractor')];

  const calls = [];

  require.cache[require.resolve('../services/data/mediaExtractor')] = {
    id: require.resolve('../services/data/mediaExtractor'),
    filename: require.resolve('../services/data/mediaExtractor'),
    loaded: true,
    exports: {
      extractMediaForTrend: async () => null,
      isPlaceholderMediaUrl: () => false
    }
  };

  require.cache[require.resolve('../models/Trend')] = {
    id: require.resolve('../models/Trend'),
    filename: require.resolve('../models/Trend'),
    loaded: true,
    exports: {
      findOneAndUpdate: (_filter, update) => {
        calls.push(update);
        return {
          lean: async () => ({ _id: 'trend-1', ...update.$set })
        };
      },
      findByIdAndUpdate: async () => ({ lean: async () => ({}) }),
      countDocuments: async () => 0,
      find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }) }),
      aggregate: async () => []
    }
  };

  delete require.cache[require.resolve('../services/trendService')];
  const { saveTrends } = require('../services/trendService');

  try {
    await saveTrends([
      {
        title: 'Legacy image trend',
        source: 'Reddit',
        category: 'Tech',
        score: 80,
        thumbnail: 'https://example.com/thumb.jpg',
        image: '',
        video: '',
        mediaType: 'image',
        scoreDetails: { formula: 'test' },
        link: 'https://example.com',
        excerpt: 'Legacy trend',
        fetchedAt: new Date(),
        tags: []
      }
    ]);
  } finally {
    if (originalTrendModel) require.cache[require.resolve('../models/Trend')] = originalTrendModel;
    else delete require.cache[require.resolve('../models/Trend')];

    if (originalTrendService) require.cache[require.resolve('../services/trendService')] = originalTrendService;
    else delete require.cache[require.resolve('../services/trendService')];

    if (originalMediaExtractor) require.cache[require.resolve('../services/data/mediaExtractor')] = originalMediaExtractor;
    else delete require.cache[require.resolve('../services/data/mediaExtractor')];
  }

  return calls;
};

test('saveTrends repairs blank image fields from existing thumbnails before persistence', async () => {
  const calls = await withStubbedTrendModel();

  assert.equal(calls.length, 1, 'saveTrends should persist one trend');
  assert.equal(calls[0].$set.image, 'https://example.com/thumb.jpg', 'blank image should fall back to thumbnail before persistence');
  assert.equal(calls[0].$set.thumbnail, 'https://example.com/thumb.jpg', 'thumbnail should remain intact');
});
