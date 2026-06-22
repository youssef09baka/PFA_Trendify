const test = require('node:test');
const assert = require('node:assert/strict');

const withStubbedModules = async (scenario = 'real') => {
  const originalTrendService = require.cache[require.resolve('../services/trendService')];
  const originalAiService = require.cache[require.resolve('../services/aiService')];
  const originalTrendModel = require.cache[require.resolve('../models/Trend')];
  const originalUserModel = require.cache[require.resolve('../models/User')];

  const state = { generateCalls: 0, updateCalls: 0, reservedQuotaCalls: 0, refundedQuotaCalls: 0 };

  const isOldFallbackScenario = scenario === 'old-fallback-values';
  const isFreshScenario = scenario === 'fresh' || scenario === 'quota';

  const validTrendId = '507f191e810c19729de860ea';

  require.cache[require.resolve('../services/trendService')] = {
    id: require.resolve('../services/trendService'),
    filename: require.resolve('../services/trendService'),
    loaded: true,
    exports: {
      getTrendById: async () => ({
        _id: validTrendId,
        title: isOldFallbackScenario ? 'Old fallback trend' : 'Stored trend',
        source: 'Reddit',
        category: 'Tech',
        score: 80,
        scoreDetails: {},
        analysis: isOldFallbackScenario ? 'AI unavailable' : isFreshScenario ? '' : 'Stored analysis',
        idea: isOldFallbackScenario ? 'No idea available' : isFreshScenario ? '' : 'Stored idea',
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
      findByIdAndUpdate: async () => {
        state.refundedQuotaCalls += 1;
        return { aiRemaining: 1 };
      }
    }
  };

  require.cache[require.resolve('../services/aiService')] = {
    id: require.resolve('../services/aiService'),
    filename: require.resolve('../services/aiService'),
    loaded: true,
    exports: {
      generateTrendAnalysis: async () => {
        state.generateCalls += 1;
        if (scenario === 'ai-error') {
          const error = new Error('Analyse temporairement indisponible.');
          error.statusCode = 503;
          error.status = 'ai_unavailable';
          throw error;
        }
        return { status: 'groq', summary: 'Fresh analysis', opportunity: 'Fresh idea' };
      }
    }
  };

  require.cache[require.resolve('../models/Trend')] = {
    id: require.resolve('../models/Trend'),
    filename: require.resolve('../models/Trend'),
    loaded: true,
    exports: {
      findByIdAndUpdate: () => {
        state.updateCalls += 1;
        return {
          lean: async () => ({ _id: 'trend-1' })
        };
      }
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

test('analyzeTrend always regenerates analysis even when stored values exist', async () => {
  const { state, nextError, res, statusCode } = await withStubbedModules('real');

  assert.equal(nextError, null);
  assert.equal(state.generateCalls, 1, 'stored analysis should not bypass Groq');
  assert.equal(state.updateCalls, 0, 'fresh analysis must not be stored on Trend');
  assert.equal(state.reservedQuotaCalls, 1, 'fresh analysis should reserve AI quota');
  assert.equal(statusCode, 200);
  assert.equal(res.body.analysis.status, 'groq');
  assert.equal(res.body.analysis.summary, 'Fresh analysis');
  assert.equal(res.body.analysis.opportunity, 'Fresh idea');
});

test('analyzeTrend regenerates analysis when old fallback values exist', async () => {
  const { state, nextError, res, statusCode } = await withStubbedModules('old-fallback-values');

  assert.equal(nextError, null);
  assert.equal(state.generateCalls, 1, 'old cache values should trigger fresh Groq analysis');
  assert.equal(state.updateCalls, 0, 'regeneration must not be stored on Trend');
  assert.equal(statusCode, 200);
  assert.notEqual(res.body.analysis.status, 'stored');
  assert.equal(res.body.analysis.summary, 'Fresh analysis');
  assert.equal(res.body.analysis.opportunity, 'Fresh idea');
});

test('analyzeTrend returns ai_unavailable and refunds quota when Groq fails', async () => {
  const { state, nextError, res } = await withStubbedModules('ai-error');

  assert.equal(res.body, null);
  assert.equal(state.generateCalls, 1, 'analysis should be attempted once');
  assert.equal(state.refundedQuotaCalls, 1, 'quota should be restored after AI failure');
  assert.ok(nextError, 'Groq failure should be passed to error middleware');
  assert.equal(nextError.statusCode, 503);
  assert.equal(nextError.status, 'ai_unavailable');
  assert.equal(nextError.message, 'Analyse temporairement indisponible.');
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
