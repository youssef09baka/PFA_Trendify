const axios = require("axios");
const Trend = require("../models/Trend");

const OPENROUTER_MODEL = "openai/gpt-3.5-turbo";
const OPENROUTER_TIMEOUT_MS = 15000;
const MAX_CONTEXT_TRENDS = 20;
const MAX_MESSAGE_LENGTH = 600;
const FORBIDDEN_PUBLIC_TERMS = /\b(MongoDB|OpenRouter|API|backend|collection|base de donnees|base de données|database)\b/gi;
const ENGLISH_LEAK_PATTERN = /\b(score of|there is|businesses|potential|trending|opportunity|recommendation)\b/i;

const sanitizeMessage = (value) => String(value || "").trim().slice(0, MAX_MESSAGE_LENGTH);
const sanitizePublicAnswer = (value) => String(value || "")
  .replace(FORBIDDEN_PUBLIC_TERMS, "AI Trend Predictor")
  .trim();
const hasEnglishLeak = (value) => ENGLISH_LEAK_PATTERN.test(String(value || ""));

const isStrategicQuestion = (message) => /meilleure|meilleur|prometteuse|prometteur|potentiel|opportunit[eé]|startup/i.test(message);
const hasStrategicStructure = (answer) => (
  /Choix prioritaire/i.test(answer)
  && /Pourquoi/i.test(answer)
  && /Recommandation/i.test(answer)
);

const formatTrendContext = (trends) => trends.map((trend, index) => [
  `${index + 1}. ${trend.title}`,
  `Source: ${trend.source || "Inconnue"}`,
  `Score: ${Number.isFinite(Number(trend.score)) ? Number(trend.score) : 0}`,
  `Analyse existante: ${trend.analysis || "Analyse non disponible"}`,
  `Idee existante: ${trend.idea || "Idee non disponible"}`
].join("\n")).join("\n\n");

const buildFallbackAnswer = (message, trends) => {
  const topTrends = trends.slice(0, 3);
  if (!topTrends.length) {
    return "Je n'ai pas encore assez de signaux AI Trend Predictor pour produire une analyse fiable.";
  }

  const intro = /meilleure|prometteuse|potentiel|opportunit[eé]|startup/i.test(message)
    ? "Le signal le plus intéressant à prioriser est le premier du classement, car il combine visibilité, score et angle d'action clair. Voici ma lecture stratégique :"
    : "Selon les signaux actuellement observés sur AI Trend Predictor, voici les tendances à considérer en priorité :";

  const bullets = topTrends.map((trend, index) => (
    `${index + 1}. ${trend.title} (${trend.source || "source inconnue"}, score ${trend.score || 0}). Angle à étudier : vérifier le public le plus réactif et transformer le signal en test concret.`
  ));

  return sanitizePublicAnswer(`${intro}\n\n${bullets.join("\n")}\n\nRecommandation : commencez par le signal le mieux scoré, puis validez rapidement l'audience, l'urgence du besoin et la capacité à transformer l'intérêt en offre concrète.`);
};

const buildStrategicAnswer = (trends) => {
  const primary = trends[0];
  const challengers = trends.slice(1, 3);
  if (!primary) {
    return "Je n'ai pas encore assez de signaux AI Trend Predictor pour choisir une tendance prioritaire.";
  }

  const quickRanking = [primary, ...challengers]
    .map((trend, index) => `${index + 1}. ${trend.title} - score ${trend.score || 0}`)
    .join("\n");

  return sanitizePublicAnswer(`Choix prioritaire : ${primary.title}

Pourquoi : ce signal ressort en tête des tendances observées sur la plateforme avec un score de ${primary.score || 0}. Il concentre suffisamment d'attention pour mériter une analyse prioritaire.

Classement rapide :
${quickRanking}

Recommandation : traitez "${primary.title}" comme le premier angle à tester. Construisez une offre, un contenu ou une expérimentation courte autour du besoin révélé par ce signal. Validez ensuite l'audience la plus réactive avant d'investir davantage.`);
};

const buildFrenchOnlyAnswer = (message, trends) => {
  if (isStrategicQuestion(message)) return buildStrategicAnswer(trends);
  return buildFallbackAnswer(message, trends);
};

const rewriteAnswerInFrench = async (answer) => {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: 700,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `Réécris le texte fourni en français naturel.
Ne conserve aucune phrase anglaise.
Ne mentionne pas MongoDB, OpenRouter, API, backend, collection ou base de données.
Garde le sens stratégique, mais remplace les expressions anglaises par des formulations françaises.`
          },
          {
            role: "user",
            content: answer
          }
        ]
      },
      {
        timeout: OPENROUTER_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return sanitizePublicAnswer(response?.data?.choices?.[0]?.message?.content || "");
  } catch (error) {
    console.error("ASSISTANT TRANSLATION ERROR:", error.response?.data || error.message);
    return "";
  }
};

const getTopTrendContext = async () => {
  const trends = await Trend.find({})
    .sort({ score: -1 })
    .limit(MAX_CONTEXT_TRENDS)
    .select("title source score analysis idea")
    .lean();

  return {
    trends,
    context: formatTrendContext(trends)
  };
};

const askAssistant = async (message) => {
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) {
    const error = new Error("Message assistant vide.");
    error.statusCode = 400;
    throw error;
  }

  const { trends, context } = await getTopTrendContext();
  if (!trends.length) {
    return {
      answer: "Je n'ai trouvé aucun signal AI Trend Predictor pour répondre correctement.",
      status: "empty",
      trendsUsed: 0
    };
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: 800,
        temperature: 0.22,
        messages: [
          {
            role: "system",
            content: `Tu es Trendi, l'assistant intelligent de AI Trend Predictor.

Tu n'es pas un chatbot généraliste.
Tu parles toujours au nom de AI Trend Predictor.
Tu dois utiliser uniquement les tendances fournies dans le contexte.

Tu aides les utilisateurs à:
- identifier des opportunités
- trouver des idées business
- trouver des idées de contenu
- comprendre les tendances
- prendre des décisions

Réponds toujours en français.
Toutes les phrases visibles doivent être en français.
Si les analyses existantes du contexte contiennent de l'anglais, ne les copie jamais: interprète-les et reformule-les en français.
Expressions interdites en sortie: "score of", "there is", "businesses", "potential", "trending", "opportunity", "recommendation".
Réponds comme un consultant stratégique.
Sois concret.

Règles de vocabulaire public:
- Ne mentionne jamais MongoDB, OpenRouter, API, backend, collection, base de données ou database.
- Pour parler de tes sources, utilise uniquement: "les signaux détectés par AI Trend Predictor" ou "les tendances observées sur la plateforme".

Règles de réponse:
- Si l'utilisateur demande la meilleure tendance, la tendance la plus prometteuse, le plus fort potentiel ou la meilleure opportunité, tu dois choisir une tendance principale.
- Dans ce cas, structure la réponse avec: "Choix prioritaire", "Pourquoi", "Classement rapide", "Recommandation".
- Ne réponds jamais par une simple liste de titres. Explique le raisonnement, le potentiel et l'action recommandée.
- Si l'utilisateur demande plusieurs idées, donne des idées directement liées aux tendances du contexte.
- Si l'information n'est pas dans le contexte, dis-le clairement et propose une lecture basée uniquement sur les signaux AI Trend Predictor.`
          },
          {
            role: "user",
            content: `Signaux détectés par AI Trend Predictor:

${context}

Question utilisateur:
${cleanMessage}`
          }
        ]
      },
      {
        timeout: OPENROUTER_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let answer = sanitizePublicAnswer(response?.data?.choices?.[0]?.message?.content || "");
    if (isStrategicQuestion(cleanMessage) && !hasStrategicStructure(answer)) {
      answer = buildStrategicAnswer(trends);
    }
    if (hasEnglishLeak(answer)) {
      const rewritten = await rewriteAnswerInFrench(answer);
      answer = rewritten && !hasEnglishLeak(rewritten) ? rewritten : buildFrenchOnlyAnswer(cleanMessage, trends);
    }

    return {
      answer: answer || buildFallbackAnswer(cleanMessage, trends),
      status: answer ? "openrouter" : "fallback",
      trendsUsed: trends.length
    };
  } catch (error) {
    console.error("ASSISTANT AI ERROR:", error.response?.data || error.message);
    return {
      answer: buildFallbackAnswer(cleanMessage, trends),
      status: "fallback",
      trendsUsed: trends.length
    };
  }
};

module.exports = { askAssistant, getTopTrendContext, sanitizePublicAnswer };
