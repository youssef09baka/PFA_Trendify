const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const originalMongooseConnection = mongoose.connection;
  const originalConnectionDescriptor = Object.getOwnPropertyDescriptor(mongoose, 'connection');
const withStubbedModules = async (scenario) => {
  const originalGetRealTrends = require.cache[require.resolve('../services/data')];
  const originalAiService = require.cache[require.resolve('../services/aiService')];
  const originalMlService = require.cache[require.resolve('../services/mlService')];
  const originalTrendService = require.cache[require.resolve('../services/trendService')];

  const state = {
    generateBatchAnalysisCalls: 0,
    predictTrendCalls: 0,
    saveTrendsCalls: 0,
  };

  require.cache[require.resolve('../services/data')] = {
    id: require.resolve('../services/data'),
    filename: require.resolve('../services/data'),
    loaded: true,
    exports: {
      getRealTrends: async () => [
        { title: 'AI trend', popularity: 50, growth: 10, source: 'Reddit' },
        { title: 'Search trend', popularity: 40, growth: 8, source: 'Google Trends' }
      ]
    }
  };

  require.cache[require.resolve('../services/aiService')] = {
    id: require.resolve('../services/aiService'),
    filename: require.resolve('../services/aiService'),
    loaded: true,
    exports: {
      generateBatchAnalysis: async (trends) => {
        state.generateBatchAnalysisCalls += 1;
        return trends;
      }
    }
  };

  require.cache[require.resolve('../services/mlService')] = {
    id: require.resolve('../services/mlService'),
    filename: require.resolve('../services/mlService'),
    loaded: true,
    exports: {
      predictTrend: async () => {
        state.predictTrendCalls += 1;
        return 'UNKNOWN';
      }
    }
  };

  require.cache[require.resolve('../services/trendService')] = {
    id: require.resolve('../services/trendService'),
    filename: require.resolve('../services/trendService'),
    loaded: true,
    exports: {
      saveTrends: async (trends) => {
        state.saveTrendsCalls += 1;
        return trends;
      },
      scoreTrends: (trends) => trends.map((trend, index) => ({
        ...trend,
        score: 70 + index,
        scoreDetails: { formula: 'test' }
      }))
    }
  };

  delete require.cache[require.resolve('../services/feedSync')];
  const { runSync } = require('../services/feedSync');

  Object.defineProperty(mongoose, 'connection', {
    value: { readyState: 1 },
    configurable: true,
    writable: true
  });

  try {
    await runSync();
  } finally {
    if (originalConnectionDescriptor) {
      Object.defineProperty(mongoose, 'connection', originalConnectionDescriptor);
    } else {
      delete mongoose.connection;
    }
    if (originalGetRealTrends) require.cache[require.resolve('../services/data')] = originalGetRealTrends;
    else delete require.cache[require.resolve('../services/data')];

    if (originalAiService) require.cache[require.resolve('../services/aiService')] = originalAiService;
    else delete require.cache[require.resolve('../services/aiService')];

    if (originalMlService) require.cache[require.resolve('../services/mlService')] = originalMlService;
    else delete require.cache[require.resolve('../services/mlService')];

    if (originalTrendService) require.cache[require.resolve('../services/trendService')] = originalTrendService;
    else delete require.cache[require.resolve('../services/trendService')];

    delete require.cache[require.resolve('../services/feedSync')];
  }

  return state;
};

test('runSync keeps sync lightweight and avoids AI/ML calls', async () => {
  const state = await withStubbedModules();

  assert.equal(state.generateBatchAnalysisCalls, 0, 'sync should not call generateBatchAnalysis');
  assert.equal(state.predictTrendCalls, 0, 'sync should not call predictTrend');
  assert.equal(state.saveTrendsCalls, 1, 'sync should still persist scored trends');
});
