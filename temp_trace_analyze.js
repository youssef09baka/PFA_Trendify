const path = require('path');
const root = path.resolve(__dirname);
const trendControllerPath = require.resolve('./backend/controllers/feedController');
const mlServicePath = require.resolve('./backend/services/mlService');
const aiServicePath = require.resolve('./backend/services/aiService');
const trendModelPath = require.resolve('./backend/models/Trend');
const userModelPath = require.resolve('./backend/models/User');
const trendServicePath = require.resolve('./backend/services/trendService');

const originalMlService = require('./backend/services/mlService');

require.cache[mlServicePath] = {
  id: mlServicePath,
  filename: mlServicePath,
  loaded: true,
  exports: {
    predictTrend: async (trend) => {
      console.log('predictTrend invoked for trend:', trend.title);
      const result = await originalMlService.predictTrend(trend);
      console.log('predictTrend returned:', result);
      return result;
    }
  }
};

require.cache[aiServicePath] = {
  id: aiServicePath,
  filename: aiServicePath,
  loaded: true,
  exports: {
    generateTrendAnalysis: async (trend) => {
      console.log('generateTrendAnalysis invoked for trend:', trend.title);
      return { status: 'openrouter', summary: 'Fresh analysis', opportunity: 'Fresh idea' };
    },
    generateBatchAnalysis: async () => []
  }
};

require.cache[trendModelPath] = {
  id: trendModelPath,
  filename: trendModelPath,
  loaded: true,
  exports: {
    findByIdAndUpdate: (id, update) => {
      console.log('Trend.findByIdAndUpdate called with id:', id);
      console.log('Trend.update payload:', JSON.stringify(update, null, 2));
      return { lean: async () => ({ _id: id, ...update.$set }) };
    }
  }
};

require.cache[userModelPath] = {
  id: userModelPath,
  filename: userModelPath,
  loaded: true,
  exports: {
    findOneAndUpdate: async (query, update) => {
      console.log('User.findOneAndUpdate called with query:', JSON.stringify(query), 'update:', JSON.stringify(update));
      return { _id: query._id, aiRemaining: 0 };
    },
    findByIdAndUpdate: async (id, update) => {
      console.log('User.findByIdAndUpdate called with id:', id, 'update:', JSON.stringify(update));
      return { aiRemaining: 1 };
    }
  }
};

require.cache[trendServicePath] = {
  id: trendServicePath,
  filename: trendServicePath,
  loaded: true,
  exports: {
    getTrendById: async (id) => ({
      _id: id,
      title: 'Trace Trend',
      source: 'Reddit',
      category: 'Tech',
      score: 75,
      scoreDetails: {},
      analysis: '',
      idea: '',
      link: 'https://reddit.com',
      image: '',
      thumbnail: '',
      mediaType: 'image',
      num_comments: 42,
      post_length: 180,
      hour: 14,
      title_length: 24,
      sentiment: 0.2
    }),
    getFeedTrends: async () => ({ data: [], meta: {} }),
    getRelatedTrends: async () => [],
    saveTrends: async () => []
  }
};

delete require.cache[trendControllerPath];
const { analyzeTrend } = require('./backend/controllers/feedController');

const req = {
  params: { id: '507f191e810c19729de860ea' },
  user: { _id: 'user-1', aiRemaining: 1, save: async () => {} }
};
const res = {
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; }
};
let nextError = null;
const next = (err) => { nextError = err; };

(async () => {
  console.log('--- Starting analyzeTrend() trace ---');
  analyzeTrend(req, res, next);
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('--- analyzeTrend() finished ---');
  console.log('statusCode', res.statusCode);
  console.log('nextError', nextError);
  console.log('response.trend.ml_prediction', res.body?.trend?.ml_prediction);
  console.log('response.analysis.status', res.body?.analysis?.status);
  console.log('response.analysis.summary', res.body?.analysis?.summary);
  console.log('full response', JSON.stringify(res.body, null, 2));
})();
