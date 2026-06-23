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
const ACADEMIC_STYLE_PATTERN = /\b(je vais prendre un peu de recul|il est important de noter que|avant de repondre a votre question|avant de répondre à votre question|il est essentiel de considerer|il est essentiel de considérer|je vous recommande fortement|en fin de compte|cependant|d'autre part|cela depend de nombreux facteurs|cela dépend de nombreux facteurs)\b/gi;

const TOPIC_STOPWORDS = new Set([
  "je", "j", "veux", "savoir", "connaitre", "connaître", "donne", "donnes", "moi", "sur", "la", "le", "les", "un", "une", "des",
  "de", "du", "d", "dernier", "derniere", "dernière", "tendance", "tendances", "actuelle", "actuelles", "meilleure", "meilleur",
  "prometteuse", "prometteur", "plus", "fort", "forte", "potentiel", "opportunite", "opportunité", "opportunites", "opportunités",
  "idee", "idée", "idees", "idées", "business", "contenu", "contenus", "analyse", "analyser", "rapport", "pourquoi", "important",
  "startup", "startups", "creer", "créer", "faire", "trouver", "quelle", "quelles", "quel", "quels", "est", "sont", "avec",
  "dans", "pour", "par", "au", "aux", "ce", "cet", "cette", "ces", "aujourd", "hui", "actuellement", "dernières", "dernieres",
  "dis", "dit", "parle", "montre", "affiche", "explique"
]);

const TOPIC_ALIASES = {
  ia: ["ia", "ai", "intelligence artificielle", "openai", "chatgpt", "llm", "machine learning", "generative ai"],
  ai: ["ai", "ia", "artificial intelligence", "openai", "chatgpt", "llm", "machine learning", "generative ai"],
  gaming: ["gaming", "jeu", "jeux", "game", "gta", "rockstar", "playstation", "xbox", "nintendo", "esport", "twitch", "streamer"],
  game: ["gaming", "jeu", "jeux", "game", "gta", "rockstar", "playstation", "xbox", "nintendo", "esport"],
  sante: ["sante", "santé", "health", "medical", "medecine", "hopital", "wellness", "fitness", "nutrition"],
  santé: ["sante", "santé", "health", "medical", "medecine", "hopital", "wellness", "fitness", "nutrition"],
  health: ["sante", "santé", "health", "medical", "medecine", "hopital", "wellness", "fitness", "nutrition"],
  sport: ["sport", "football", "soccer", "fifa", "uefa", "champions league", "premier league", "world cup", "liga", "ligue 1", "serie a", "bundesliga", "nba", "basket", "tennis", "match", "finals"],
  football: ["sport", "football", "soccer", "fifa", "uefa", "champions league", "premier league", "world cup", "liga", "ligue 1", "serie a", "bundesliga", "ballon d or"],
  soccer: ["sport", "football", "soccer", "fifa", "uefa", "champions league", "premier league", "world cup", "liga", "ligue 1", "serie a", "bundesliga"],
  fifa: ["sport", "football", "soccer", "fifa", "world cup"],
  uefa: ["sport", "football", "soccer", "uefa", "champions league"],
  business: ["business", "finance", "startup", "market", "marche", "revenue", "stock", "bourse", "crypto", "bitcoin", "ethereum"],
  startup: ["startup", "startups", "business", "entrepreneur", "entreprise", "saas", "financement", "levee de fonds"],
  crypto: ["crypto", "cryptomonnaie", "bitcoin", "btc", "ethereum", "eth", "solana", "blockchain", "web3"],
  technologie: ["technologie", "technology", "tech", "software", "cyber", "data", "cloud", "app", "digital"],
  tech: ["tech", "technologie", "technology", "software", "cyber", "data", "cloud", "app", "digital"]
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
  .replace(ACADEMIC_STYLE_PATTERN, "")
  .replace(/\s+([.,;:!?])/g, "$1")
  .replace(/[ \t]{2,}/g, " ")
  .trim();

const includesAny = (text, phrases) => phrases.some((phrase) => text.includes(phrase));

const hasWord = (text, words) => words.some((word) => new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(text));

const preferenceIntents = [
  { id: "gaming", label: "Gaming", words: ["gaming", "game", "jeux", "jeu video", "jeux video", "gamer", "gaming seulement"] },
  { id: "business", label: "Business", words: ["business", "finance", "marche", "entreprise", "business seulement"] },
  { id: "tech", label: "Tech", words: ["tech", "technologie", "technologies", "digital", "ia", "ai"] },
  { id: "startup", label: "Startup", words: ["startup", "startups"] },
  { id: "health", label: "Sante", words: ["sante", "medical", "bien etre", "health"] },
  { id: "society", label: "Societe", words: ["societe", "social", "society"] },
  { id: "creator", label: "Createurs", words: ["createur", "createurs", "creator", "contenu"] },
  { id: "education", label: "Education", words: ["education", "ecole", "formation", "apprentissage"] }
];

const navigationIntents = [
  { target: "/home", label: "Accueil", message: "J'ouvre Accueil.", words: ["accueil", "home", "page accueil"] },
  { target: "/feed", label: "Explorer", message: "J'ouvre Explorer.", words: ["explorer", "feed", "flux"] },
  { target: "/favorites", label: "Favoris", message: "J'ouvre Favoris.", words: ["favoris", "favori", "fav", "favs", "sauvegardes", "sauvegarde", "enregistres", "bookmarks"] },
  { target: "/profile", label: "Profil", message: "J'ouvre Profil.", words: ["profil", "profile", "compte"] },
  { target: "/profile", label: "Preferences", message: "J'ouvre Preferences.", words: ["preferences", "preference", "parametres", "settings"] },
  { target: "/search", label: "Recherche", message: "J'ouvre Recherche.", words: ["recherche", "chercher", "search"] }
];

const ADVICE_INTENT_PATTERNS = [
  "je veux lancer un business",
  "lancer un business",
  "lancer une entreprise",
  "creer un business",
  "créer un business",
  "creer une entreprise",
  "créer une entreprise",
  "je commence de zero",
  "je commence de zéro",
  "partir de zero",
  "partir de zéro",
  "que me conseilles tu",
  "que me conseille tu",
  "tu me conseilles quoi",
  "ou investir",
  "où investir",
  "quelle niche choisir",
  "quel projet lancer",
  "quelle opportunite est interessante",
  "quelle opportunité est intéressante",
  "comment gagner de l argent",
  "comment gagner de l'argent",
  "gagner de l argent avec les tendances",
  "gagner de l'argent avec les tendances",
  "quelle tendance a le plus de potentiel",
  "tendance a le plus de potentiel",
  "meilleure opportunite",
  "meilleure opportunité",
  "opportunites du moment",
  "opportunités du moment",
  "quoi lancer",
  "idee de projet",
  "idée de projet"
];

const buildIntent = (category, confidence, extra = {}) => ({
  category,
  confidence: Math.max(0, Math.min(1, confidence)),
  ...extra
});

const getConversationalAnswer = (message) => {
  const normalized = normalizeSearchText(message);

  if (/^(salut|bonjour|bonsoir|coucou|hello|hi|salam)$/.test(normalized)) {
    return "Salut. Comment puis-je t'aider aujourd'hui ?";
  }

  if (/^(merci|merci beaucoup|thanks)$/.test(normalized)) {
    return "Avec plaisir. Tu veux explorer une autre tendance ?";
  }

  if (/^(au revoir|bye|a plus|a bientot)$/.test(normalized)) {
    return "A bientot. Reviens quand tu veux analyser un nouveau signal.";
  }

  if (/^(comment vas tu|ca va|comment ca va)$/.test(normalized)) {
    return "Ca va bien. Je suis pret a t'aider sur les tendances du moment.";
  }

  if (/^(qui es tu|qui etes vous|tu es qui)$/.test(normalized)) {
    return "Je suis Trendi. Je peux t'aider a analyser des tendances, trouver des opportunites et explorer les signaux detectes sur Trendify.";
  }

  return "Je peux t'aider a trouver une tendance, comparer des opportunites ou generer une idee de contenu. Tu veux commencer par quel sujet ?";
};

const buildAction = (action, target, message, extra = {}) => ({
  type: "action",
  action,
  target,
  message,
  ...extra
});

const normalizePendingAction = (pendingAction) => {
  if (!pendingAction || typeof pendingAction !== "object") return null;
  const action = String(pendingAction.action || "").trim();
  const target = String(pendingAction.target || "").trim();
  const message = String(pendingAction.message || "").trim();
  if (!["navigate", "theme", "filter", "search", "open_trend", "analyze"].includes(action) || !target) return null;
  return buildAction(action, target, message || "Action confirmee.", {
    confidence: Number(pendingAction.confidence || 0.86)
  });
};

const isConfirmationMessage = (normalized) => [
  "oui", "oui vas y", "vas y", "confirme", "je confirme", "d accord", "daccord", "ok", "okay", "fais le", "fait le"
].includes(normalized);

const classifyAssistantIntent = (message, clientContext = {}) => {
  const raw = String(message || "").trim();
  const normalized = normalizeSearchText(raw);
  if (!normalized) return buildIntent("empty", 1);

  const pendingAction = normalizePendingAction(clientContext.pendingAction);
  if (pendingAction && isConfirmationMessage(normalized)) {
    return buildIntent("confirmation", 0.96, {
      action: pendingAction
    });
  }

  const conversationExact = [
    "salut", "bonjour", "bonsoir", "coucou", "hello", "hi", "salam",
    "merci", "merci beaucoup", "ok", "okay", "oui", "super", "parfait", "ca marche",
    "d accord", "daccord", "au revoir", "bye", "a plus", "a bientot",
    "comment vas tu", "ca va", "comment ca va", "qui es tu", "qui etes vous", "tu es qui"
  ];

  if (conversationExact.includes(normalized)) {
    return buildIntent("conversation", 0.98);
  }

  if (includesAny(normalized, ["que peux tu faire", "aide moi", "aide-moi", "comment tu peux m aider", "comment ca marche"])) {
    return buildIntent("help", 0.92);
  }

  const searchMatch = raw.match(/\b(?:cherche|recherche|trouve|chercher|lance une recherche|lance la recherche)\s+(?:moi\s+|sur\s+)?(.{2,80})$/i);
  if (searchMatch?.[1]) {
    const query = searchMatch[1].trim();
    return buildIntent("search", 0.94, {
      action: buildAction("search", query, `Recherche ${query} lancee.`, { confidence: 0.94 })
    });
  }

  const themeVerb = hasWord(normalized, ["active", "activer", "mets", "met", "remets", "remet", "passe", "basculer", "bascule", "change", "changer", "prefere", "veux", "switch"]);
  const darkTarget = includesAny(normalized, ["mode sombre", "theme sombre", "theme noir", "interface sombre", "interface en noir", "mode noir", "site en noir", "dark mode"]) || hasWord(normalized, ["sombre", "noir", "dark"]);
  const lightTarget = includesAny(normalized, ["mode clair", "theme clair", "interface claire", "interface en blanc", "light mode"]) || hasWord(normalized, ["clair", "blanc", "light"]);

  if (darkTarget && (themeVerb || includesAny(normalized, ["dark mode", "theme sombre", "mode sombre", "mode noir"]))) {
    return buildIntent("theme", themeVerb ? 0.95 : 0.78, {
      action: buildAction("theme", "dark", "Mode sombre active.", { confidence: themeVerb ? 0.95 : 0.78 })
    });
  }

  if (lightTarget && (themeVerb || includesAny(normalized, ["light mode", "theme clair", "mode clair"]))) {
    return buildIntent("theme", themeVerb ? 0.95 : 0.78, {
      action: buildAction("theme", "light", "Mode clair active.", { confidence: themeVerb ? 0.95 : 0.78 })
    });
  }

  const naturalSearchMatch = normalized.match(/\b(?:montre|affiche|voir)\s+(?:moi\s+)?(?:les\s+)?tendances?\s+(?:sur\s+|de\s+)?(.{2,80})$/i);
  if (naturalSearchMatch?.[1]) {
    const query = naturalSearchMatch[1].trim().toUpperCase() === "IA" ? "IA" : naturalSearchMatch[1].trim();
    const filterMatch = preferenceIntents.find((item) => item.id !== "tech" && includesAny(query, item.words));
    if (filterMatch) {
      return buildIntent("preferences", 0.9, {
        action: buildAction("filter", filterMatch.id, `Filtre ${filterMatch.label} applique.`, { confidence: 0.9 })
      });
    }
    return buildIntent("search", 0.9, {
      action: buildAction("search", query, `Recherche ${query} lancee.`, { confidence: 0.9 })
    });
  }

  const filterVerb = hasWord(normalized, ["filtre", "filtrer", "affiche", "montre", "voir", "passe"]) || includesAny(normalized, ["je veux voir", "montre moi", "affiche moi", "uniquement"]);
  if (filterVerb || hasWord(normalized, ["preference", "preferences"])) {
    const match = preferenceIntents.find((item) => includesAny(normalized, item.words));
    if (match) {
      return buildIntent("preferences", 0.9, {
        action: buildAction("filter", match.id, `Filtre ${match.label} applique.`, { confidence: 0.9 })
      });
    }
  }

  const analysisTarget = includesAny(normalized, ["celle la", "celle ci", "celui la", "celui ci", "cette tendance", "ce signal", "le premier", "la premiere", "premier resultat", "1er", "premiere tendance"]);
  if ((hasWord(normalized, ["ouvre", "ouvrir", "affiche", "voir"]) && analysisTarget) || includesAny(normalized, ["ouvre le premier", "ouvre la premiere"])) {
    return buildIntent("analysis", 0.9, {
      action: buildAction("open_trend", clientContext?.lastTrend?.id || "current", "J'ouvre cette tendance.", { confidence: 0.9 })
    });
  }

  if ((hasWord(normalized, ["analyse", "analyser", "rapport"]) && (analysisTarget || hasWord(normalized, ["lance", "ouvre", "affiche", "voir"]))) || includesAny(normalized, ["analyse celle la", "analyse celle ci", "lance une analyse"])) {
    return buildIntent("analysis", 0.92, {
      action: buildAction("analyze", clientContext?.lastTrend?.id || "current", "Je lance l'analyse.", { confidence: 0.92 })
    });
  }

  const navigationVerb = hasWord(normalized, ["ouvre", "ouvrir", "va", "aller", "affiche", "montre", "emmene", "emmener", "navigue", "naviguer", "accede", "acceder", "passe", "go"]) || includesAny(normalized, ["je veux explorer", "je veux aller", "conduis moi", "page"]);
  const navigationTarget = navigationIntents.find((item) => includesAny(normalized, item.words));
  if (navigationTarget && navigationVerb) {
    return buildIntent("navigation", 0.93, {
      action: buildAction("navigate", navigationTarget.target, navigationTarget.message, { confidence: 0.93 })
    });
  }

  if (navigationTarget && !navigationVerb) {
    return buildIntent("navigation", 0.86, {
      action: buildAction("navigate", navigationTarget.target, navigationTarget.message, { confidence: 0.86 })
    });
  }

  if (includesAny(normalized, ADVICE_INTENT_PATTERNS)) {
    return buildIntent("advice", 0.9);
  }

  return buildIntent("trend_search", 0.72);
};

const parseAssistantAction = (message, clientContext = {}) => {
  const intent = classifyAssistantIntent(message, clientContext);
  return intent.action || null;
};

const detectAssistantIntent = (message, clientContext = {}) => classifyAssistantIntent(message, clientContext).category;

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
  const domainTopic = raw.match(/\btendances?\s+(ia|ai|gaming|sante|santé|health|sport|football|soccer|fifa|uefa|crypto|business|startup|technologie|tech)\b/i);
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
  return { hasTopic: true, phrase: normalizedPhrase, terms: [...terms].slice(0, 24) };
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

const formatActionableTrend = (trend) => ({
  id: String(trend?._id || trend?.id || ""),
  title: trend?.title || "",
  source: trend?.source || "",
  category: trend?.category || "",
  score: Number(trend?.score || 0),
  link: trend?.link || ""
});

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
    .select("title source category score tags link")
    .lean();

  const trends = topic.hasTopic ? rankRelevantTrends(rawTrends, topic) : rawTrends.slice(0, MAX_CONTEXT_TRENDS);
  return {
    trends,
    context: formatTrendContext(trends),
    topic
  };
};

const requestAssistantAnswer = async (cleanMessage, context, topic, mode = "trend_search") => {
  if (!process.env.GROQ_API_KEY) {
    throw createAssistantUnavailableError();
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      max_tokens: 520,
      temperature: 0.18,
      messages: [
        {
          role: "system",
          content: `Tu es Trendi, l'assistant vocal et naturel de Trendify.

Tu parles comme Siri, ChatGPT Voice ou Gemini Live: court, direct, humain.
Tu n'ecris jamais comme un professeur, un rapport, ou un consultant corporate.
Tu reponds d'abord, puis tu poses une petite question utile si cela aide.
Tu utilises uniquement les tendances fournies, sans parler de technique.
Si l'utilisateur donne un sujet precis, reste strictement sur ce sujet.
Ne recommande jamais une tendance hors sujet.
Reponds toujours en francais.

Format obligatoire:
- 3 a 8 phrases maximum.
- Phrases courtes.
- Pas de long paragraphe.
- Si tu listes, utilise 3 a 5 puces maximum.
- Termine souvent par une question naturelle.

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
- Chaque reponse doit donner une interpretation simple et une action possible.
- Ne revele pas les chiffres techniques de priorisation.
- Si plusieurs tendances existent, fais un classement argumente et conclus par un choix clair.
- Si la question porte sur un sujet precis, classe uniquement les tendances liees a ce sujet.
- Si le mode est conseil business, n'effectue pas une recherche exacte: repere les domaines les plus prometteurs dans les tendances fournies, propose 1 a 3 pistes concretes et une premiere action simple.
- Si le sujet est gaming, parle a des joueurs, createurs gaming, studios, streamers ou medias gaming.

Phrases interdites:
- Je vais prendre un peu de recul
- Il est important de noter que
- Avant de repondre a votre question
- Il est essentiel de considerer
- Je vous recommande fortement
- En fin de compte
- Cependant
- D'autre part
- Cela depend de nombreux facteurs`
        },
        {
          role: "user",
          content: `Mode: ${mode === "advice" ? "conseil business" : "analyse de tendances"}
Sujet detecte: ${topic?.hasTopic ? (topic.phrase || topic.terms.join(" ")) : "aucun sujet specifique"}

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

const normalizeClientTrend = (trend) => {
  if (!trend || typeof trend !== "object") return null;
  const id = String(trend.id || trend._id || "").trim();
  const title = String(trend.title || "").trim();
  if (!id || !title) return null;

  return {
    _id: id,
    id,
    title,
    source: String(trend.source || ""),
    category: String(trend.category || ""),
    score: Number(trend.score || 0),
    tags: Array.isArray(trend.tags) ? trend.tags : [],
    link: String(trend.link || "")
  };
};

const shouldUseLastTrendContext = (message, clientContext = {}) => {
  const lastTrend = normalizeClientTrend(clientContext.lastTrend);
  if (!lastTrend) return false;
  const normalized = normalizeSearchText(message);
  return includesAny(normalized, [
    "celle la", "celle ci", "cette tendance", "ce signal", "la dessus", "sur ca",
    "donne moi des idees business", "idees business", "idees de contenu", "plus de details",
    "pour cette tendance", "pour ce sujet"
  ]);
};

const buildFollowUpMessage = (message, clientContext = {}) => {
  const normalized = normalizeSearchText(message);
  const lastSubject = String(clientContext?.shortMemory?.lastSubject || clientContext?.shortMemory?.lastSearch || "").trim();
  if (!lastSubject) return message;

  const followUpPatterns = [
    "donne moi des idees business",
    "idees business",
    "idees de contenu",
    "plus de details",
    "explique moi",
    "pourquoi c est important"
  ];

  return includesAny(normalized, followUpPatterns) ? `${message} sur ${lastSubject}` : message;
};

const askAssistant = async (message, clientContext = {}) => {
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) {
    const error = new Error("Message assistant vide.");
    error.statusCode = 400;
    throw error;
  }

  const intent = classifyAssistantIntent(cleanMessage, clientContext);
  console.info("[TRENDI] INTENTION DETECTEE", {
    message: cleanMessage,
    intent: intent.category,
    confidence: intent.confidence,
    action: intent.action?.action || null,
    target: intent.action?.target || null,
    pendingAction: intent.pendingAction?.action || null
  });

  if (intent.action) {
    return {
      answer: intent.action.message,
      status: "action",
      trendsUsed: 0,
      trends: [],
      action: intent.action,
      pendingAction: null,
      intent: intent.category,
      confidence: intent.confidence
    };
  }

  if (intent.category === "clarification") {
    return {
      answer: intent.answer || "Tu veux que j'ouvre une page ou que je lance une recherche ?",
      status: "clarification",
      trendsUsed: 0,
      trends: [],
      action: null,
      pendingAction: intent.pendingAction || null,
      intent: intent.category,
      confidence: intent.confidence
    };
  }

  if (intent.category === "conversation" || intent.category === "help") {
    return {
      answer: getConversationalAnswer(cleanMessage),
      status: intent.category,
      trendsUsed: 0,
      trends: [],
      action: null,
      pendingAction: null,
      intent: intent.category,
      confidence: intent.confidence
    };
  }

  const contextualMessage = buildFollowUpMessage(cleanMessage, clientContext);
  const lastTrend = shouldUseLastTrendContext(cleanMessage, clientContext) ? normalizeClientTrend(clientContext.lastTrend) : null;
  const contextSource = lastTrend
    ? { trends: [lastTrend], context: formatTrendContext([lastTrend]), topic: { hasTopic: true, phrase: normalizeSearchText(lastTrend.title), terms: normalizeSearchText(lastTrend.title).split(/\s+/).filter(Boolean).slice(0, 8) } }
    : await getTopTrendContext(intent.category === "advice" ? "" : contextualMessage);
  const { trends, context, topic } = contextSource;

  if (!trends.length) {
    return {
      answer: intent.category === "advice"
        ? "Je n'ai pas encore assez de tendances exploitables pour te conseiller correctement."
        : topic?.hasTopic ? NO_RELEVANT_TRENDS_MESSAGE : "Je n'ai pas encore assez de tendances exploitables pour repondre correctement.",
      status: intent.category === "advice" ? "empty_advice" : topic?.hasTopic ? "no_relevant_trends" : "empty",
      trendsUsed: 0,
      trends: [],
      action: null,
      pendingAction: null,
      intent: intent.category,
      confidence: intent.confidence
    };
  }

  try {
    const answer = await requestAssistantAnswer(cleanMessage, context, topic, intent.category);
    if (!answer || ENGLISH_LEAK_PATTERN.test(answer)) {
      throw createAssistantUnavailableError();
    }
    return {
      answer,
      status: "groq",
      trendsUsed: trends.length,
      trends: trends.map(formatActionableTrend).filter((trend) => trend.id).slice(0, 3),
      action: null,
      pendingAction: null,
      intent: intent.category,
      confidence: intent.confidence
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
  classifyAssistantIntent,
  detectAssistantIntent,
  getConversationalAnswer,
  parseAssistantAction,
  extractTopicTerms,
  calculateTrendRelevance,
  createAssistantUnavailableError
};
