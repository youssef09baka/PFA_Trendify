const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');

const validAnalysis = {
  summary: 'Résumé du signal.',
  whyItMatters: 'Impact concret.',
  whyTrendRises: 'Raison de la hausse.',
  targetAudience: 'Public concerné.',
  marketAnalysis: 'Analyse du marché.',
  opportunity: 'Opportunité : piste contextualisée.',
  risks: ['Risque spécifique.'],
  confidence: 'Moyenne',
  confidenceReason: 'Les données disponibles restent limitées.',
  recommendations: ['Action concrète.'],
  businessOpportunities: ['Piste commerciale liée au sujet.'],
  contentIdeas: ['Angle éditorial précis.'],
  conclusion: 'Position stratégique.'
};

test('generateTrendAnalysis allows enough output tokens for a complete structured report', async () => {
  const axiosPath = require.resolve('axios');
  const servicePath = require.resolve('../services/aiService');
  const originalAxios = require.cache[axiosPath];
  const originalService = require.cache[servicePath];
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  let requestBody;

  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
  require.cache[axiosPath] = {
    id: axiosPath,
    filename: axiosPath,
    loaded: true,
    exports: {
      post: async (_url, body) => {
        requestBody = body;
        return {
          data: {
            choices: [{ message: { content: JSON.stringify(validAnalysis) } }]
          }
        };
      }
    }
  };
  delete require.cache[servicePath];

  try {
    const { generateTrendAnalysis } = require('../services/aiService');
    const analysis = await generateTrendAnalysis({ title: 'Tendance de test' });

    assert.equal(requestBody.model, 'openai/gpt-oss-120b');
    assert.equal(requestBody.reasoning_effort, 'low');
    assert.equal(requestBody.max_tokens, 3000);
    assert.equal(analysis.status, 'groq');
    assert.equal(analysis.summary, validAnalysis.summary);
  } finally {
    if (originalAxios) require.cache[axiosPath] = originalAxios;
    else delete require.cache[axiosPath];
    if (originalService) require.cache[servicePath] = originalService;
    else delete require.cache[servicePath];
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;
  }
});

test('generateTrendAnalysis reports progress from streamed JSON fields', async () => {
  const axiosPath = require.resolve('axios');
  const servicePath = require.resolve('../services/aiService');
  const originalAxios = require.cache[axiosPath];
  const originalService = require.cache[servicePath];
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  const progressEvents = [];
  let requestBody;
  let requestOptions;
  const reportText = JSON.stringify(validAnalysis);
  const streamChunks = Array.from({ length: Math.ceil(reportText.length / 24) }, (_, index) => {
    const content = reportText.slice(index * 24, (index + 1) * 24);
    return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
  });
  streamChunks.push('data: [DONE]\n\n');

  process.env.GROQ_API_KEY = 'test-key';
  require.cache[axiosPath] = {
    id: axiosPath,
    filename: axiosPath,
    loaded: true,
    exports: {
      post: async (_url, body, options) => {
        requestBody = body;
        requestOptions = options;
        return { data: Readable.from(streamChunks) };
      }
    }
  };
  delete require.cache[servicePath];

  try {
    const { generateTrendAnalysis } = require('../services/aiService');
    const analysis = await generateTrendAnalysis({ title: 'Tendance de test' }, (event) => progressEvents.push(event));
    const percentages = progressEvents.map((event) => event.progress);

    assert.equal(requestBody.stream, true);
    assert.equal(requestBody.reasoning_effort, 'low');
    assert.equal(requestOptions.responseType, 'stream');
    assert.equal(requestOptions.timeout, undefined);
    assert.equal(requestOptions.signal, undefined);
    assert.ok(percentages.some((progress) => progress > 0 && progress < 100));
    assert.deepEqual(percentages, [...percentages].sort((a, b) => a - b));
    assert.equal(percentages.at(-1), 100);
    assert.equal(analysis.summary, validAnalysis.summary);
  } finally {
    if (originalAxios) require.cache[axiosPath] = originalAxios;
    else delete require.cache[axiosPath];
    if (originalService) require.cache[servicePath] = originalService;
    else delete require.cache[servicePath];
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;
  }
});
