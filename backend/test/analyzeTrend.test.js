const test = require('node:test');
const assert = require('node:assert/strict');

const withStubbedModules = async (scenario = 'real') => {
  const originalTrendService = require.cache[require.resolve('../services/trendService')];
  const originalAiService = require.cache[require.resolve('../services/aiService')];
  const originalTrendModel = require.cache[require.resolve('../models/Trend')];
  const originalUserModel = require.cache[require.resolve('../models/User')];

  const state = { generateCalls: 0, updateCalls: 0, reservedQuotaCalls: 0 };

  const isFallbackScenario = scenario === 'fallback';
  const isFreshScenario = scenario === 'fresh' || scenario === 'quota';

  const validTrendId = '507f191e810c19729de860ea';

  require.cache[require.resolve('../services/trendService')] = {
    id: require.resolve('../services/trendService'),
    filename: require.resolve('../services/trendService'),
    loaded: true,
    exports: {
      getTrendById: async () => ({
        _id: validTrendId,
        title: isFallbackScenario ? 'Fallback trend' : 'Stored trend',
        source: 'Reddit',
        category: 'Tech',
        score: 80,
        scoreDetails: {},
        analysis: isFallbackScenario ? 'AI unavailable' : isFreshScenario ? '' : 'Stored analysis',
        idea: isFallbackScenario ? 'No idea available' : isFreshScenario ? '' : 'Stored idea',
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

  require.cache[require.resolve('../models/User')] = {
    id: require.resolve('../models/User'),
    filename: require.resolve('../models/User'),
    loaded: true,
    exports: {
      findOneAndUpdate: async (query, update) => {
        if (query?._id && query.aiRemaining?.['$gt'] === 0) {
          state.reservedQuotaCalls += 1;
          return { _id: query._id, aiRemaining: 0 };
        }
        return null;
      },
      findByIdAndUpdate: async () => ({ aiRemaining: 1 })
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

  const req = {
    params: { id: scenario === 'invalid-id' ? '123-not-objectid' : validTrendId },
    user: { _id: 'user-1', aiRemaining: scenario === 'quota' ? 1 : 5, save: async () => {} }
  };
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  let nextError = null;
  const next = (err) => { nextError = err; };

  analyzeTrend(req, res, next);
  await new Promise((resolve) => setTimeout(resolve, 250));

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

test('analyzeTrend reserves AI quota atomically and returns updated balance', async () => {
  const { state, nextError, res, statusCode } = await withStubbedModules('quota');

  assert.equal(nextError, null);
  assert.equal(state.reservedQuotaCalls, 1, 'quota should be reserved via atomic findOneAndUpdate');
  assert.equal(state.generateCalls, 1, 'analysis should be generated when no stored analysis exists');
  assert.equal(statusCode, 200);
  assert.equal(res.body.aiRemaining, 0, 'response should reflect decremented AI quota');
});

test('analyzeTrend rejects invalid trend ids before querying the database', async () => {
  const { nextError, res, statusCode } = await withStubbedModules('invalid-id');

  assert.equal(res.statusCode, 200, 'res.statusCode should remain default when error is passed to next');
  assert.ok(nextError, 'invalid ObjectId should be handled by next');
  assert.equal(nextError.statusCode, 400);
  assert.equal(nextError.message, 'Invalid trend ID format');
});
