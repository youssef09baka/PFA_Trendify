const test = require('node:test');
const assert = require('node:assert/strict');

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
  process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
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
