const logger = require('../utils/logger');
const axios = require("axios");

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_MAX_TOKENS = 3000;

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

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    whyItMatters: { type: "string" },
    whyTrendRises: { type: "string" },
    targetAudience: { type: "string" },
    marketAnalysis: { type: "string" },
    opportunity: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    confidence: { type: "string" },
    confidenceReason: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
    businessOpportunities: { type: "array", items: { type: "string" } },
    contentIdeas: { type: "array", items: { type: "string" } },
    conclusion: { type: "string" }
  },
  required: [
    "summary",
    "whyItMatters",
    "whyTrendRises",
    "targetAudience",
    "marketAnalysis",
    "opportunity",
    "risks",
    "confidence",
    "confidenceReason",
    "recommendations",
    "businessOpportunities",
    "contentIdeas",
    "conclusion"
  ],
  additionalProperties: false
};
const ANALYSIS_FIELDS = Object.keys(ANALYSIS_JSON_SCHEMA.properties);

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

const generateTrendAnalysis = async (trend, onProgress, model = GROQ_MODEL) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      logger.error("TREND AI ERROR: GROQ_API_KEY is missing");
      throw createAiUnavailableError();
    }

    const requestBody = {
      model,
      max_tokens: GROQ_MAX_TOKENS,
      reasoning_effort: "low",
      temperature: 0.16,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "trend_analysis",
          strict: true,
          schema: ANALYSIS_JSON_SCHEMA
        }
      },
      messages: [
        {
          role: "user",
          content: buildPrompt(trend)
        }
      ],
      ...(onProgress ? { stream: true } : {})
    };

    onProgress?.({ progress: 0, phase: "Connexion au moteur IA…" });
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      requestBody,
      {
        ...(onProgress ? { responseType: "stream" } : {}),
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let text = "";
    if (onProgress) {
      onProgress({ progress: 0, phase: "Le moteur IA rédige le rapport…" });
      let pending = "";
      const reportFields = new Set();
      const consumeLine = (line) => {
        if (!line.startsWith("data:")) return;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") return;

        let event;
        try {
          event = JSON.parse(payload);
        } catch {
          return;
        }

        const content = event?.choices?.[0]?.delta?.content;
        if (typeof content !== "string") return;
        text += content;
        ANALYSIS_FIELDS.forEach((field) => {
          if (new RegExp(`\\"${field}\\"\\s*:`).test(text)) reportFields.add(field);
        });

        const progress = Math.min(95, Math.floor((reportFields.size / ANALYSIS_FIELDS.length) * 95));
        onProgress({
          progress,
          phase: `Rédaction du rapport — ${reportFields.size}/${ANALYSIS_FIELDS.length} sections reçues…`
        });
      };

      for await (const chunk of response.data) {
        pending += chunk.toString();
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || "";
        lines.forEach(consumeLine);
      }
      if (pending) consumeLine(pending);
    } else {
      text = String(response?.data?.choices?.[0]?.message?.content || "").trim();
    }

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
    const parsed = JSON.parse(jsonText);
    const analysis = normalizeAnalysis(parsed);

    if (!validateAnalysis(analysis)) {
      throw createAiUnavailableError();
    }

    onProgress?.({ progress: 100, phase: "Rapport vérifié et prêt." });
    return analysis;
  } catch (error) {
    if (error?.status === "ai_unavailable") throw error;
    const providerMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
    logger.error("TREND AI ERROR:", {
      model,
      status: error.response?.status || error.statusCode || null,
      code: error.code || null,
      message: String(providerMessage || "Unknown provider error").slice(0, 500)
    });
    throw createAiUnavailableError();
  }
};

module.exports = { generateTrendAnalysis, createAiUnavailableError };
