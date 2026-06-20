/**
 * AI Service - Groq Provider (Test Branch)
 * Generates trend analysis using Groq API with model selection support.
 * Supports: deepseek-r1-distill-llama-70b, qwen/qwen3-32b, llama-3.3-70b-versatile
 */

const axios = require("axios");

// Groq model options
const GROQ_MODELS = {
  DEEPSEEK: "deepseek-r1-distill-llama-70b",
  QWEN: "qwen-2.5-32b",
  LLAMA: "llama-3.3-70b-versatile"
};

// Default model (can be overridden via env or parameter)
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || GROQ_MODELS.LLAMA;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MAX_TOKENS = 500;

if (!GROQ_API_KEY) {
  console.warn("WARNING: GROQ_API_KEY not set. AI analysis will use fallback content.");
}

const buildFallbackTrendAnalysis = (trend) => ({
  status: 'fallback',
  model: 'fallback',
  summary: trend.analysis || `Ce signal gagne en visibilité et mérite une lecture rapide pour comprendre pourquoi il attire l'attention.`,
  whyItMatters: `Le sujet est visible dans les signaux actuels de traction. Le point clé est de confirmer si le momentum peut devenir durable et exploitable.`,
  opportunity: trend.idea || `Construisez une mini-édition, un briefing ou un format court autour de "${trend.title}" pour capturer l'intérêt dès maintenant.`,
  businessOpportunities: [
    `Préparer un angle business ou newsletter autour de "${trend.title}".`,
    `Transformer le sujet en mini-briefing, format vidéo court ou segment d'actualité.`,
    `Créer une formation, webinaire ou contenu éducatif autour de "${trend.title}".`
  ],
  contentIdeas: [
    `Créer un extrait de veille rapide autour de "${trend.title}".`,
    `Préparer un angle business ou contenu à partir des signaux de croissance visibles.`,
    `Développer une analyse approfondie combinant trends multiples incluant "${trend.title}".`
  ],
  growthPotential: `Le signal montre un potentiel de traction raisonnable, mais il doit être confirmé par la poursuite de l'engagement et des discussions.`,
  marketInterpretation: `Le sujet est déjà visible dans les signaux de traction actuels. L'intérêt principal est de confirmer s'il peut se transformer en opportunité durable.`,
  prediction: `Le signal a un potentiel raisonnable de poursuivre sa visibilité si l'engagement et les discussions continuent à monter.`,
  confidence: 'Moyen'
});

const generateTrendAnalysisGroq = async (trend, model = DEFAULT_GROQ_MODEL) => {
  if (!GROQ_API_KEY) {
    return buildFallbackTrendAnalysis(trend);
  }

  try {
    const startTime = Date.now();

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: model,
        max_tokens: GROQ_MAX_TOKENS,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: `You are a market intelligence analyst for entrepreneurs, startups, marketers and product teams. Return ONLY compact JSON with these exact keys:
{"summary":"...","whyItMatters":"...","opportunity":"...","businessOpportunities":["...","...","..."],"contentIdeas":["...","...","..."],"confidence":"Low|Medium|High"}

Trend: ${trend.title}
Source: ${trend.source || 'unknown'}
Category: ${trend.category || 'General'}
Score: ${trend.score || 0}
Existing summary: ${String(trend.analysis || '').slice(0, 100)}
Existing idea: ${String(trend.idea || '').slice(0, 100)}

STRICT RULES:
1. Analyze the REAL signal, do not restate the title.
2. Explain why this trend matters economically, technologically, or commercially.
3. Identify the underlying market shift or emerging behavior.
4. "opportunity" = ONE concrete, realistic business opportunity.
5. "businessOpportunities" = EXACTLY 3 distinct opportunities (different from each other and from opportunity field).
6. "contentIdeas" = EXACTLY 3 distinct content ideas (different from business opportunities).
7. FORBIDDEN WORDS: monitor, worth watching, growing traction, gaining visibility, momentum, buzz, interesting, watch, follow.
8. Do NOT repeat ideas across fields.
9. "whyItMatters" must NOT repeat "summary".
10. Market impact must be explicit: explain who wins, loses, or which market changes.
11. Confidence = "Low", "Medium", or "High" only.
12. Return ONLY JSON, no markdown, no explanation, no code block.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const responseTime = Date.now() - startTime;
    const text = String(response?.data?.choices?.[0]?.message?.content || '').trim();
    
    // Extract JSON from response
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
    const parsed = JSON.parse(jsonText);

    // Validate structure
    const result = {
      status: 'groq',
      model: model,
      responseTime: responseTime,
      summary: parsed.summary || trend.analysis || '',
      whyItMatters: parsed.whyItMatters || parsed.summary || '',
      opportunity: parsed.opportunity || trend.idea || '',
      businessOpportunities: Array.isArray(parsed.businessOpportunities) && parsed.businessOpportunities.length >= 3
        ? parsed.businessOpportunities.slice(0, 3)
        : [parsed.opportunity || trend.idea || '', '', ''],
      contentIdeas: Array.isArray(parsed.contentIdeas) && parsed.contentIdeas.length >= 3
        ? parsed.contentIdeas.slice(0, 3)
        : [trend.idea || '', '', ''],
      growthPotential: parsed.growthPotential || `Potentiel de traction modéré selon l'engagement observé.`,
      marketInterpretation: parsed.marketInterpretation || parsed.whyItMatters || `Le signal mérite un suivi humain.`,
      prediction: parsed.prediction || `Le sujet devrait continuer à attirer l'attention si l'engagement reste soutenu.`,
      confidence: ['Low', 'Medium', 'High'].includes(parsed.confidence) ? parsed.confidence : 'Medium'
    };

    return result;
  } catch (error) {
    console.error(`TREND AI ERROR [${model}]:`, error.response?.data || error.message);
    return buildFallbackTrendAnalysis(trend);
  }
};

const generateBatchAnalysisGroq = async (trends, model = DEFAULT_GROQ_MODEL) => {
  if (!GROQ_API_KEY) {
    return trends.map(t => ({
      ...t,
      analysis: t.analysis || `This trend appears to be active right now and is worth monitoring based on current traction.`,
      idea: t.idea || `Consider packaging this topic as a short-form update, newsletter entry, or social highlight.`
    }));
  }

  try {
    const prompt = trends.map((t, i) => 
      `${i + 1}. ${t.title}`
    ).join("\n");

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: model,
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `For each trend below, return ONLY:
Analysis: why it is trending (specific to the trend, not generic)
Idea: one concrete business or content idea

Format STRICT:
1. Analysis: ...
   Idea: ...

2. Analysis: ...
   Idea: ...

Trends:
${prompt}

Rules:
- Do NOT use generic phrases: monitor, worth watching, traction, visibility, momentum.
- Analysis must explain the real signal and market shift.
- Idea must be specific, actionable, and different from the Analysis.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const text = response.data.choices[0].message.content;
    const parts = text.split(/\d+\.\s+/).filter(Boolean);

    return trends.map((trend, index) => {
      const part = parts[index] || "";

      const analysisMatch = part.match(/Analysis:\s*([\s\S]*?)(?:\n\s*Idea:|$)/i);
      const ideaMatch = part.match(/Idea:\s*([\s\S]*)/i);

      const analysis = analysisMatch ? analysisMatch[1].trim() : trend.analysis || "";
      const idea = ideaMatch ? ideaMatch[1].trim() : trend.idea || "";

      return {
        ...trend,
        analysis: analysis || `This topic is gaining momentum as a ${trend.source?.toLowerCase() || 'trend'} signal.`,
        idea: idea || `Create a concise take or landing page around "${trend.title}" to capture interest quickly.`,
        model: model
      };
    });

  } catch (error) {
    console.error(`BATCH AI ERROR [${model}]:`, error.response?.data || error.message);

    return trends.map(trend => ({
      ...trend,
      analysis: trend.analysis || `This trend appears to be active right now.`,
      idea: trend.idea || `Consider packaging this topic as a short-form update.`,
      model: model
    }));
  }
};

// Backward compatibility: default to Llama model when called without specification
const generateTrendAnalysis = async (trend) => {
  return generateTrendAnalysisGroq(trend, GROQ_MODELS.LLAMA);
};

const generateBatchAnalysis = async (trends) => {
  return generateBatchAnalysisGroq(trends, GROQ_MODELS.LLAMA);
};

module.exports = {
  generateBatchAnalysis,
  generateTrendAnalysis,
  generateTrendAnalysisGroq,
  generateBatchAnalysisGroq,
  GROQ_MODELS,
  DEFAULT_GROQ_MODEL
};
