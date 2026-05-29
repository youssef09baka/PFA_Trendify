const test = require('node:test');
const assert = require('node:assert/strict');

const withStubbedModules = async (scenario = 'real') => {
  const originalTrendService = require.cache[require.resolve('../services/trendService')];
  const originalAiService = require.cache[require.resolve('../services/aiService')];
  const originalTrendModel = require.cache[require.resolve('../models/Trend')];

  const state = { generateCalls: 0, updateCalls: 0 };

  const isFallbackScenario = scenario === 'fallback';

  require.cache[require.resolve('../services/trendService')] = {
    id: require.resolve('../services/trendService'),
    filename: require.resolve('../services/trendService'),
    loaded: true,
    exports: {
      getTrendById: async () => ({
        _id: 'trend-1',
        title: isFallbackScenario ? 'Fallback trend' : 'Stored trend',
        source: 'Reddit',
        category: 'Tech',
        score: 80,
        scoreDetails: {},
        analysis: isFallbackScenario ? 'AI unavailable' : 'Stored analysis',
        idea: isFallbackScenario ? 'No idea available' : 'Stored idea',
        link: '',
        image: '',
        thumbnail: '',
        mediaType: 'image'
      }),
      getFeedTrends: async () => ({ data: [], meta: {} }),
      getRelatedTrends: async () => [],
      saveTrends: async () => []
    }
  };

  require.cache[require.resolve('../services/aiService')] = {
    id: require.resolve('../services/aiService'),
    filename: require.resolve('../services/aiService'),
    loaded: true,
    exports: {
      generateBatchAnalysis: async () => [],
      generateTrendAnalysis: async () => {
        state.generateCalls += 1;
        return { status: 'openrouter', summary: 'Fresh analysis', opportunity: 'Fresh idea' };
      }
    }
  };

  require.cache[require.resolve('../models/Trend')] = {
    id: require.resolve('../models/Trend'),
    filename: require.resolve('../models/Trend'),
    loaded: true,
    exports: {
      findByIdAndUpdate: () => ({
        lean: async () => ({ _id: 'trend-1' })
      })
    }
  };

  delete require.cache[require.resolve('../controllers/feedController')];
  const { analyzeTrend } = require('../controllers/feedController');

  const req = { params: { id: 'trend-1' }, user: { aiRemaining: 5, save: async () => {} } };
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  let nextError = null;
  const next = (err) => { nextError = err; };

  analyzeTrend(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));

  if (originalTrendService) require.cache[require.resolve('../services/trendService')] = originalTrendService;
  else delete require.cache[require.resolve('../services/trendService')];
  if (originalAiService) require.cache[require.resolve('../services/aiService')] = originalAiService;
  else delete require.cache[require.resolve('../services/aiService')];
  if (originalTrendModel) require.cache[require.resolve('../models/Trend')] = originalTrendModel;
  else delete require.cache[require.resolve('../models/Trend')];
  delete require.cache[require.resolve('../controllers/feedController')];

  return { state, nextError, res, statusCode: res.statusCode };
};

test('analyzeTrend reuses stored analysis and does not call OpenRouter', async () => {
  const { state, nextError, res, statusCode } = await withStubbedModules('real');

  assert.equal(nextError, null);
  assert.equal(state.generateCalls, 0, 'stored analysis should avoid OpenRouter');
  assert.equal(statusCode, 200);
  assert.equal(res.body.analysis.status, 'stored');
  assert.equal(res.body.analysis.summary, 'Stored analysis');
});

test('analyzeTrend ignores fallback cache values and regenerates analysis', async () => {
  const { state, nextError, res, statusCode } = await withStubbedModules('fallback');

  assert.equal(nextError, null);
  assert.equal(state.generateCalls, 1, 'fallback cache values should trigger fresh OpenRouter analysis');
  assert.equal(statusCode, 200);
  assert.notEqual(res.body.analysis.status, 'stored');
  assert.equal(res.body.analysis.summary, 'Fresh analysis');
  assert.equal(res.body.analysis.opportunity, 'Fresh idea');
});
