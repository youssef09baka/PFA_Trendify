const axios = require("axios");
const Trend = require("../models/Trend");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 15000;
const MAX_CONTEXT_TRENDS = 20;
const RELEVANT_CONTEXT_LIMIT = 40;
const MAX_MESSAGE_LENGTH = 600;
const NO_RELEVANT_TRENDS_MESSAGE = "Aucune tendance pertinente trouvée pour cette recherche.";

const FORBIDDEN_PUBLIC_TERMS = /\b(MongoDB|OpenRouter|Groq|API|backend|collection|base de donnees|base de données|database|sources internes|source interne|systeme|système|contexte|Google Trends score|score\s+\d+|score)\b/gi;
const ENGLISH_LEAK_PATTERN = /\b(score of|there is|businesses|potential|trending|opportunity|recommendation)\b/i;

const TOPIC_STOPWORDS = new Set([
  "je", "j", "veux", "savoir", "connaitre", "connaître", "donne", "donnes", "moi", "sur", "la", "le", "les", "un", "une", "des",
  "de", "du", "d", "dernier", "derniere", "dernière", "tendance", "tendances", "actuelle", "actuelles", "meilleure", "meilleur",
  "prometteuse", "prometteur", "plus", "fort", "forte", "potentiel", "opportunite", "opportunité", "opportunites", "opportunités",
  "idee", "idée", "idees", "idées", "business", "contenu", "contenus", "analyse", "analyser", "rapport", "pourquoi", "important",
  "startup", "startups", "creer", "créer", "faire", "trouver", "quelle", "quelles", "quel", "quels", "est", "sont", "avec",
  "dans", "pour", "par", "au", "aux", "ce", "cet", "cette", "ces", "aujourd", "hui", "actuellement", "dernières", "dernieres"
]);

const TOPIC_ALIASES = {
  ia: ["ia", "ai", "intelligence artificielle", "openai", "chatgpt"],
  ai: ["ai", "ia", "artificial intelligence", "openai", "chatgpt"],
  gaming: ["gaming", "jeu", "jeux", "game", "gta", "playstation", "xbox", "nintendo", "esport"],
  sante: ["sante", "santé", "health", "medical", "wellness", "fitness"],
  santé: ["sante", "santé", "health", "medical", "wellness", "fitness"],
  sport: ["sport", "nba", "football", "basket", "tennis", "match", "finals"],
  business: ["business", "finance", "startup", "market", "revenue", "stock"],
  technologie: ["technologie", "technology", "tech", "software", "cyber", "data"],
  tech: ["tech", "technologie", "technology", "software", "cyber", "data"]
};

const sanitizeMessage = (value) => String(value || "").trim().slice(0, MAX_MESSAGE_LENGTH);
const normalizeSearchText = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizePublicAnswer = (value) => String(value || "")
  .replace(FORBIDDEN_PUBLIC_TERMS, "")
  .replace(/\s+([.,;:!?])/g, "$1")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

const createAssistantUnavailableError = () => {
  const error = new Error("Trendi est temporairement indisponible.");
  error.statusCode = 503;
  error.status = "ai_unavailable";
  return error;
};

const extractTopicTerms = (message) => {
  const raw = String(message || "").trim();
  const normalized = normalizeSearchText(raw);
  if (!normalized) return { hasTopic: false, phrase: "", terms: [] };

  const quoted = raw.match(/["'“”‘’]([^"'“”‘’]{2,80})["'“”‘’]/);
  const explicitTopic = raw.match(/\b(?:sur|concernant|a propos de|à propos de|recherche|chercher|cherche)\s+(.{2,80})$/i);
  const domainTopic = raw.match(/\btendances?\s+(ia|ai|gaming|sante|santé|sport|business|technologie|tech)\b/i);
  const phraseSource = quoted?.[1] || explicitTopic?.[1] || domainTopic?.[1] || "";
  const normalizedPhrase = normalizeSearchText(phraseSource);

  const baseWords = (normalizedPhrase || normalized)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !TOPIC_STOPWORDS.has(word))
    .filter((word) => word.length > 1 || /\d/.test(word));

  const terms = new Set();
  if (domainTopic?.[1]) {
    terms.add(normalizeSearchText(domainTopic[1]));
  }
  baseWords.forEach((word) => {
    terms.add(word);
    (TOPIC_ALIASES[word] || []).forEach((alias) => {
      normalizeSearchText(alias).split(/\s+/).filter(Boolean).forEach((part) => terms.add(part));
    });
  });

  const hasExplicitTopic = Boolean(normalizedPhrase);
  const hasSpecificNamedTopic = baseWords.some((word) => /\d/.test(word) || word.length >= 3);
  const hasKnownDomainTopic = baseWords.some((word) => TOPIC_ALIASES[word]);
  const hasTopic = hasExplicitTopic || hasSpecificNamedTopic || hasKnownDomainTopic;

  if (!hasTopic) return { hasTopic: false, phrase: "", terms: [] };
  return { hasTopic: true, phrase: normalizedPhrase, terms: [...terms].slice(0, 10) };
};

const trendSearchText = (trend) => normalizeSearchText([
  trend?.title,
  trend?.category,
  trend?.source,
  Array.isArray(trend?.tags) ? trend.tags.join(" ") : ""
].filter(Boolean).join(" "));

const calculateTrendRelevance = (trend, topic) => {
  if (!topic?.hasTopic) return Number(trend?.score || 0);

  const title = normalizeSearchText(trend?.title || "");
  const category = normalizeSearchText(trend?.category || "");
  const tags = normalizeSearchText(Array.isArray(trend?.tags) ? trend.tags.join(" ") : "");
  const fullText = trendSearchText(trend);
  let relevance = 0;

  if (topic.phrase && title.includes(topic.phrase)) relevance += 80;
  if (topic.phrase && fullText.includes(topic.phrase)) relevance += 45;

  topic.terms.forEach((term) => {
    if (!term) return;
    const termRegex = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
    if (termRegex.test(title)) relevance += 28;
    else if (termRegex.test(category)) relevance += 16;
    else if (termRegex.test(tags)) relevance += 16;
    else if (termRegex.test(fullText)) relevance += 8;
  });

  return relevance + Math.min(Number(trend?.score || 0), 100) / 100;
};

const formatTrendContext = (trends) => trends.map((trend, index) => [
  `${index + 1}. ${trend.title}`,
  `Source: ${trend.source || "Inconnue"}`,
  `Categorie: ${trend.category || "Non renseignee"}`,
  `Priorite interne: ${Number.isFinite(Number(trend.score)) ? Number(trend.score) : 0}`,
  `Tags: ${Array.isArray(trend.tags) && trend.tags.length ? trend.tags.join(", ") : "Non renseignes"}`
].join("\n")).join("\n\n");

const buildTopicMongoQuery = (topic) => {
  if (!topic?.hasTopic || !topic.terms.length) return {};

  const regexes = topic.terms.map((term) => new RegExp(escapeRegex(term), "i"));
  const phraseRegex = topic.phrase ? new RegExp(escapeRegex(topic.phrase), "i") : null;
  const allRegexes = phraseRegex ? [phraseRegex, ...regexes] : regexes;

  return {
    $or: [
      ...allRegexes.map((regex) => ({ title: regex })),
      ...allRegexes.map((regex) => ({ category: regex })),
      ...allRegexes.map((regex) => ({ tags: regex }))
    ]
  };
};

const rankRelevantTrends = (trends, topic) => (trends || [])
  .map((trend) => ({ ...trend, relevanceScore: calculateTrendRelevance(trend, topic) }))
  .filter((trend) => !topic?.hasTopic || trend.relevanceScore >= 8)
  .sort((a, b) => b.relevanceScore - a.relevanceScore || Number(b.score || 0) - Number(a.score || 0))
  .slice(0, MAX_CONTEXT_TRENDS);

const getTopTrendContext = async (message = "") => {
  const topic = extractTopicTerms(message);
  const query = buildTopicMongoQuery(topic);
  const limit = topic.hasTopic ? RELEVANT_CONTEXT_LIMIT : MAX_CONTEXT_TRENDS;

  const rawTrends = await Trend.find(query)
    .sort({ score: -1 })
    .limit(limit)
    .select("title source category score tags")
    .lean();

  const trends = topic.hasTopic ? rankRelevantTrends(rawTrends, topic) : rawTrends.slice(0, MAX_CONTEXT_TRENDS);
  return {
    trends,
    context: formatTrendContext(trends),
    topic
  };
};

const requestAssistantAnswer = async (cleanMessage, context, topic) => {
  if (!process.env.GROQ_API_KEY) {
    throw createAssistantUnavailableError();
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      max_tokens: 1100,
      temperature: 0.18,
      messages: [
        {
          role: "system",
          content: `Tu es Trendi, l'assistant expert de Trendify.

Tu n'es pas un chatbot generaliste et tu n'es pas un moteur de recherche.
Tu reponds comme un consultant startup, un analyste marche et un expert de veille strategique.
Tu utilises uniquement les tendances fournies, mais tu ne parles jamais de donnees techniques.
Si l'utilisateur a donne un sujet precis, tu dois rester strictement sur ce sujet.
Ne recommande jamais une tendance hors sujet, meme si elle semble plus importante.
Reponds toujours en francais.

Termes interdits en sortie:
- MongoDB
- OpenRouter
- Groq
- API
- backend
- collection
- base de donnees
- database
- sources internes
- systeme
- contexte
- signaux observes
- Google Trends score
- score suivi d'un nombre
- score
- "score of"
- "there is"
- "businesses"
- "potential"
- "trending"
- "opportunity"
- "recommendation"

Regles de qualite:
- Ne donne jamais une simple liste brute de titres.
- Chaque reponse doit contenir interpretation, raisonnement et action concrete.
- Ne revele pas les chiffres techniques de priorisation.
- Si plusieurs tendances existent, fais un classement argumente et conclus par un choix clair.
- Si la question porte sur un sujet precis, classe uniquement les tendances liees a ce sujet.
- Si le sujet est gaming, le persona doit etre gaming: joueurs, createurs gaming, studios, streamers, medias gaming ou marques entertainment.`
        },
        {
          role: "user",
          content: `Sujet detecte: ${topic?.hasTopic ? (topic.phrase || topic.terms.join(" ")) : "aucun sujet specifique"}

Tendances pertinentes pour l'analyse de Trendi:

${context}

Question utilisateur:
${cleanMessage}`
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

  return sanitizePublicAnswer(response?.data?.choices?.[0]?.message?.content || "");
};

const askAssistant = async (message) => {
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) {
    const error = new Error("Message assistant vide.");
    error.statusCode = 400;
    throw error;
  }

  const { trends, context, topic } = await getTopTrendContext(cleanMessage);
  if (!trends.length) {
    return {
      answer: topic?.hasTopic ? NO_RELEVANT_TRENDS_MESSAGE : "Je n'ai pas encore assez de tendances exploitables pour repondre correctement.",
      status: topic?.hasTopic ? "no_relevant_trends" : "empty",
      trendsUsed: 0
    };
  }

  try {
    const answer = await requestAssistantAnswer(cleanMessage, context, topic);
    if (!answer || ENGLISH_LEAK_PATTERN.test(answer)) {
      throw createAssistantUnavailableError();
    }
    return {
      answer,
      status: "groq",
      trendsUsed: trends.length
    };
  } catch (error) {
    if (error?.status === "ai_unavailable") throw error;
    console.error("ASSISTANT AI ERROR:", error.response?.data || error.message);
    throw createAssistantUnavailableError();
  }
};

module.exports = {
  askAssistant,
  getTopTrendContext,
  sanitizePublicAnswer,
  extractTopicTerms,
  calculateTrendRelevance,
  createAssistantUnavailableError
};
