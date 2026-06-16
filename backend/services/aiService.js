const axios = require("axios");

const OPENROUTER_MODEL = "openai/gpt-3.5-turbo";
const OPENROUTER_MAX_TOKENS = 300;

const buildFallbackTrendAnalysis = (trend) => ({
  status: 'fallback',
  summary: trend.analysis || `Ce signal gagne en visibilité et mérite une lecture rapide pour comprendre pourquoi il attire l’attention.`,
  whyItMatters: `Le sujet est visible dans les signaux actuels de traction. Le point clé est de confirmer si le momentum peut devenir durable et exploitable.`,
  opportunity: trend.idea || `Construisez une mini-édition, un briefing ou un format court autour de "${trend.title}" pour capturer l’intérêt dès maintenant.`,
  businessOpportunities: [
    `Préparer un angle business ou newsletter autour de "${trend.title}".`,
    `Transformer le sujet en mini-briefing, format vidéo court ou segment d’actualité.`
  ],
  contentIdeas: [
    `Créer un extrait de veille rapide autour de "${trend.title}".`,
    `Préparer un angle business ou contenu à partir des signaux de croissance visibles.`
  ],
  growthPotential: 'Le signal montre un potentiel de traction raisonnable, mais il doit être confirmé par la poursuite de l’engagement et des discussions.',
  marketInterpretation: `Le sujet est déjà visible dans les signaux de traction actuels. L’intérêt principal est de confirmer s’il peut se transformer en opportunité durable.`,
  prediction: `Le signal a un potentiel raisonnable de poursuivre sa visibilité si l’engagement et les discussions continuent à monter.`,
  confidence: 'Moyen'
});

const generateTrendAnalysis = async (trend) => {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: OPENROUTER_MAX_TOKENS,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: `You are a market intelligence analyst for entrepreneurs, startups, marketers and product teams. Return compact JSON only with these keys:
{"summary":"...","whyItMatters":"...","opportunity":"...","businessOpportunities":["..."],"contentIdeas":["..."],"confidence":"Low|Medium|High or empty"}

Trend: ${trend.title}
Source: ${trend.source || 'unknown'}
Category: ${trend.category || 'General'}
Score: ${trend.score || 0}
Existing summary: ${String(trend.analysis || '').slice(0, 120)}
Existing idea: ${String(trend.idea || '').slice(0, 120)}

Rules:
- Write trend-specific analysis that uses the actual topic.
- Focus on business relevance, product direction, marketing and startup opportunity.
- Generate one clear, actionable opportunity.
- Generate 2-3 distinct business opportunities.
- Generate 2-3 distinct content ideas.
- Do not repeat wording between fields.
- Do not use generic phrases such as: monitor this trend, current traction, worth watching, short-form update, social highlight.
- Do not use boilerplate or vague business language.
- Business opportunities and content ideas must be different.
- If a field cannot be determined, return an empty string for that field.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const text = String(response?.data?.choices?.[0]?.message?.content || '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
    const parsed = JSON.parse(jsonText);

    return {
      status: 'openrouter',
      summary: parsed.summary || trend.analysis || '',
      whyItMatters: parsed.whyItMatters || parsed.summary || '',
      opportunity: parsed.opportunity || trend.idea || '',
      businessOpportunities: Array.isArray(parsed.businessOpportunities) && parsed.businessOpportunities.length ? parsed.businessOpportunities : [parsed.opportunity || trend.idea || ''],
      contentIdeas: Array.isArray(parsed.contentIdeas) && parsed.contentIdeas.length ? parsed.contentIdeas : [trend.idea || ''],
      growthPotential: parsed.summary ? 'Potentiel de traction modéré à fort selon l’engagement observé.' : '',
      marketInterpretation: parsed.whyItMatters || 'Le signal mérite un suivi humain pour confirmer son potentiel à long terme.',
      prediction: parsed.summary ? 'Le sujet devrait continuer à attirer l’attention si l’engagement reste soutenu.' : '',
      confidence: parsed.confidence || 'Medium'
    };
  } catch (error) {
    console.error("TREND AI ERROR:", error.response?.data || error.message);
    return buildFallbackTrendAnalysis(trend);
  }
};

const generateBatchAnalysis = async (trends) => {
  try {
    const prompt = trends.map((t, i) => 
      `${i + 1}. ${t.title}`
    ).join("\n");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `
For each trend below, return:
Analysis: why it is trending
Idea: one content or business idea

Format STRICT:
1. Analysis: ...
   Idea: ...

2. Analysis: ...
   Idea: ...

Trends:
${prompt}
            `
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
        analysis: analysis || `This topic is gaining momentum as a ${trend.source?.toLowerCase() || 'trend'} signal. Watch for follow-on stories and community activity around "${trend.title}".`,
        idea: idea || `Create a concise take or landing page around "${trend.title}" to capture interest quickly.`
      };
    });

  } catch (error) {
    console.error("BATCH AI ERROR:", error.response?.data || error.message);

    return trends.map(trend => ({
      ...trend,
      analysis: trend.analysis || `This trend appears to be active right now and is worth monitoring based on current traction.`,
      idea: trend.idea || `Consider packaging this topic as a short-form update, newsletter entry, or social highlight.`
    }));
  }
};

module.exports = { generateBatchAnalysis, generateTrendAnalysis };
