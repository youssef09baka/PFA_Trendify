const axios = require("axios");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_MAX_TOKENS = 1300;
const GROQ_TIMEOUT_MS = 15000;

const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();

const createAiUnavailableError = (message = "Analyse temporairement indisponible.") => {
  const error = new Error(message);
  error.statusCode = 503;
  error.status = "ai_unavailable";
  return error;
};

const buildPrompt = (trend) => `Tu es un analyste senior en intelligence marche.
Retourne uniquement un JSON valide, sans markdown, avec exactement ces cles:
{
  "summary": "...",
  "whyItMatters": "...",
  "whyTrendRises": "...",
  "targetAudience": "...",
  "marketAnalysis": "...",
  "opportunity": "...",
  "risks": ["..."],
  "confidence": "...",
  "confidenceReason": "...",
  "recommendations": ["..."],
  "businessOpportunities": ["..."],
  "contentIdeas": ["..."],
  "conclusion": "..."
}

Tendance: ${trend.title}
Source: ${trend.source || "unknown"}
Categorie: ${trend.category || "General"}
Priorite: ${trend.score || 0}
Tags: ${Array.isArray(trend.tags) && trend.tags.length ? trend.tags.join(", ") : "Non renseignes"}

Regles obligatoires:
- Tout doit etre en francais.
- Chaque paragraphe doit etre directement lie au sujet exact de la tendance.
- Ne remplis jamais avec des phrases reutilisables pour n'importe quelle tendance.
- Si le sujet est une mauvaise nouvelle, dis clairement que c'est une menace.
- Si le sujet est surtout un pic d'attention court, dis que l'opportunite est temporaire.
- Si le sujet manque de preuve, dis que le signal est neutre ou exploratoire.
- "summary" explique simplement ce qu'est la tendance.
- "whyItMatters" explique l'impact reel.
- "whyTrendRises" explique pourquoi le sujet monte maintenant.
- "targetAudience" nomme les acteurs concernes.
- "marketAnalysis" explique le besoin, la friction ou le changement marche revele.
- "opportunity" commence par "Opportunite :", "Menace :" ou "Signal neutre :", puis justifie.
- "risks" contient 3 a 4 risques specifiques au sujet.
- "recommendations" contient 3 a 4 actions concretes liees au sujet.
- "businessOpportunities" contient 3 a 5 pistes directement liees au sujet.
- "contentIdeas" contient 3 a 5 angles precis, pas des formats generiques.
- "conclusion" donne une position strategique claire.

Interdictions absolues:
- "Ce signal gagne en visibilite"
- "merite une lecture rapide"
- "Construisez un briefing"
- "capturer l'interet"
- "opportunite exploitable"
- "Le marche concerne depend directement de la source"
- "momentum durable"
- "surveiller cette tendance" sans dire quoi surveiller exactement
- paragraphes passe-partout
- recommandations valables pour toutes les tendances
- podcast, blog, newsletter, campagne publicitaire, contenu autour
- faits precis non presents dans le titre, la source, la categorie ou les tags`;

const normalizeAnalysis = (parsed) => ({
  status: "groq",
  summary: compact(parsed?.summary),
  whyItMatters: compact(parsed?.whyItMatters),
  whyTrendRises: compact(parsed?.whyTrendRises),
  targetAudience: compact(parsed?.targetAudience),
  marketAnalysis: compact(parsed?.marketAnalysis),
  opportunity: compact(parsed?.opportunity),
  risks: Array.isArray(parsed?.risks) ? parsed.risks.map(compact).filter(Boolean).slice(0, 5) : [],
  confidence: compact(parsed?.confidence),
  confidenceReason: compact(parsed?.confidenceReason),
  recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations.map(compact).filter(Boolean).slice(0, 5) : [],
  businessOpportunities: Array.isArray(parsed?.businessOpportunities) ? parsed.businessOpportunities.map(compact).filter(Boolean).slice(0, 5) : [],
  contentIdeas: Array.isArray(parsed?.contentIdeas) ? parsed.contentIdeas.map(compact).filter(Boolean).slice(0, 5) : [],
  conclusion: compact(parsed?.conclusion)
});

const validateAnalysis = (analysis) => {
  return Boolean(
    analysis.summary &&
    analysis.whyItMatters &&
    analysis.whyTrendRises &&
    analysis.targetAudience &&
    analysis.marketAnalysis &&
    analysis.opportunity &&
    analysis.confidence &&
    analysis.confidenceReason &&
    analysis.conclusion &&
    analysis.risks.length &&
    analysis.recommendations.length &&
    analysis.businessOpportunities.length &&
    analysis.contentIdeas.length
  );
};

const generateTrendAnalysis = async (trend) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw createAiUnavailableError();
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        max_tokens: GROQ_MAX_TOKENS,
        temperature: 0.16,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: buildPrompt(trend)
          }
        ]
      },
      {
        timeout: GROQ_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const text = String(response?.data?.choices?.[0]?.message?.content || "").trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
    const parsed = JSON.parse(jsonText);
    const analysis = normalizeAnalysis(parsed);

    if (!validateAnalysis(analysis)) {
      throw createAiUnavailableError();
    }

    return analysis;
  } catch (error) {
    if (error?.status === "ai_unavailable") throw error;
    console.error("TREND AI ERROR:", error.response?.data || error.message);
    throw createAiUnavailableError();
  }
};

module.exports = { generateTrendAnalysis, createAiUnavailableError };
