/**
 * AI Service
 * Generates trend analysis and content insights using OpenRouter API.
 * Provides batch analysis, trend-specific insights, and fallback content generation.
 */

const axios = require("axios");

const OPENROUTER_MODEL = "openai/gpt-3.5-turbo";
const OPENROUTER_MAX_TOKENS = 900;
const OPENROUTER_TIMEOUT_MS = 15000;

const FORBIDDEN_GENERIC_IDEA_PATTERN = /\b(podcast|podcasts|blog|blogs|newsletter|newsletters|contenu autour|campagne publicitaire|campagnes publicitaires)\b/i;

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const cleanList = (items) => (
  Array.isArray(items) ? items : []
)
  .map((item) => String(item || '').trim())
  .filter(Boolean)
  .filter((item) => !FORBIDDEN_GENERIC_IDEA_PATTERN.test(item));

const ensureSpecificList = (items, trend, fallbackItems) => {
  const seen = new Set();
  const cleaned = cleanList(items);
  const source = cleaned.length >= 2 ? cleaned : [...cleaned, ...fallbackItems];
  const values = source
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return values.slice(0, 5);
};

const inferTrendProfile = (trend) => {
  const text = normalizeText(`${trend?.title || ''} ${trend?.category || ''} ${(trend?.tags || []).join(' ')}`);
  if (/\b(nba|knicks|sport|football|soccer|basketball|tennis|match|finals|ufc|nfl)\b/.test(text)) return 'sport';
  if (/\b(health|sante|medical|doctor|hospital|mental|cancer|pharma|care|biotech|patient)\b/.test(text)) return 'sante';
  if (/\b(stock|finance|invest|market|business|startup|pricing|revenue|economy|sales|brand)\b/.test(text)) return 'business';
  if (/\b(ai|ia|openai|chatgpt|algorithm|algorithme|machine learning|data|software|tech|technology|cyber|steam|valve)\b/.test(text)) return 'tech';
  return 'general';
};

const buildBusinessFallbacks = (trend) => {
  const profile = inferTrendProfile(trend);
  const templates = {
    sport: [
      'Créer une offre d’expérience pour les fans pendant les moments de forte attention autour de la compétition ou de l’équipe.',
      'Aider les marques sportives à identifier les audiences les plus engagées et les offres adaptées à leur niveau d’intérêt.',
      'Construire un partenariat commercial lié aux moments clés du calendrier sportif concerné.'
    ],
    sante: [
      'Développer un service d’orientation qui aide les patients ou familles à trouver plus rapidement les bons professionnels.',
      'Aider les établissements de santé à prioriser les parcours de soins touchés par la hausse de la demande.',
      'Créer une solution de coordination entre patients, praticiens et structures de prise en charge.'
    ],
    business: [
      'Créer un outil d’aide à la décision pour comparer les signaux financiers, concurrentiels ou sectoriels liés à cette tendance.',
      'Proposer une offre d’analyse destinée aux investisseurs, dirigeants ou équipes commerciales exposés à ce mouvement.',
      'Développer un tableau de suivi qui relie l’intérêt du marché aux décisions opérationnelles à prendre.'
    ],
    tech: [
      'Proposer un audit d’usage pour aider les organisations à évaluer les impacts opérationnels de cette technologie.',
      'Construire une offre de conseil qui transforme le signal technologique en feuille de route produit ou gouvernance.',
      'Développer un outil de comparaison permettant aux équipes de choisir entre adoption, attente ou mitigation.'
    ],
    general: [
      'Identifier les publics directement exposés à cette tendance et tester une offre ciblée sur leur besoin immédiat.',
      'Construire une ressource opérationnelle qui aide les décideurs à comprendre les actions possibles.',
      'Créer un service d’analyse qui transforme le signal en recommandations concrètes.'
    ]
  };
  return templates[profile];
};

const buildContentFallbacks = (trend) => {
  const profile = inferTrendProfile(trend);
  const templates = {
    sport: [
      'Comparer les attentes des fans occasionnels et des supporters engagés pendant le pic d’attention sportive.',
      'Présenter les décisions qu’une marque doit prendre avant, pendant et après l’événement sportif concerné.',
      'Analyser les produits, expériences ou partenariats qui répondent le mieux à l’audience sportive visée.'
    ],
    sante: [
      'Expliquer le parcours concret d’un patient confronté au problème mis en évidence par cette tendance.',
      'Comparer les réponses possibles des praticiens, établissements et acteurs numériques face à la hausse de demande.',
      'Présenter les points de friction qui empêchent aujourd’hui une prise en charge plus rapide ou plus claire.'
    ],
    business: [
      'Comparer les décisions possibles pour un investisseur ou dirigeant exposé à cette tendance.',
      'Analyser les signaux financiers ou commerciaux à suivre avant de passer à l’action.',
      'Présenter un scénario de décision montrant comment une entreprise peut interpréter ce mouvement.'
    ],
    tech: [
      'Présenter les usages concrets que cette tendance rend plus urgents pour les équipes produit ou direction.',
      'Comparer les choix d’adoption, de gouvernance ou de protection que les organisations doivent arbitrer.',
      'Analyser les conséquences opérationnelles pour les utilisateurs, équipes techniques et décideurs.'
    ],
    general: [
      'Identifier les acteurs touchés et les décisions concrètes qu’ils doivent prendre.',
      'Comparer les réponses possibles selon le niveau d’urgence, de coût et de maturité du marché.',
      'Présenter un cas d’usage réaliste montrant comment cette tendance se transforme en action.'
    ]
  };
  return templates[profile];
};

const buildFallbackTrendAnalysis = (trend) => ({
  status: 'fallback',
  summary: trend.analysis || `Ce signal gagne en visibilité et mérite une lecture rapide pour comprendre pourquoi il attire l’attention.`,
  whyItMatters: `Le sujet est visible dans les signaux actuels de traction. Le point clé est de confirmer si le momentum peut devenir durable et exploitable.`,
  opportunity: trend.idea || `Construisez une mini-édition, un briefing ou un format court autour de "${trend.title}" pour capturer l’intérêt dès maintenant.`,
  marketAnalysis: `Le marché concerné dépend directement de la source et du contexte de "${trend.title}". Les premiers publics à observer sont les communautés déjà engagées autour du sujet, puis les marques capables de transformer cet intérêt en offre claire.`,
  businessOpportunities: buildBusinessFallbacks(trend),
  contentIdeas: buildContentFallbacks(trend)
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
            content: `You are a senior market intelligence analyst. Produce a concise professional market-analysis report. Return valid JSON only with these exact keys:
{"summary":"...","whyItMatters":"...","marketAnalysis":"...","opportunity":"...","businessOpportunities":["..."],"contentIdeas":["..."]}

Trend: ${trend.title}
Source: ${trend.source || 'unknown'}
Category: ${trend.category || 'General'}
Score: ${trend.score || 0}
Existing summary: ${String(trend.analysis || '').slice(0, 120)}
Existing idea: ${String(trend.idea || '').slice(0, 120)}

Rules:
- Language is mandatory: every title, sentence and list item must be in French. No English words or English sentence fragments, except unavoidable proper nouns from the trend title.
- Write like an analyst preparing a market memo for founders, product teams or decision makers.
- Each section must have a different role. Do not repeat the same idea or sentence across sections.
- Never simply rephrase the trend title. Interpret what the signal means.
- "summary" = short executive summary in one paragraph.
- "whyItMatters" = explain the real-world impact of the signal.
- "marketAnalysis" = explain who is concerned, why interest is increasing, and what need, friction or market change is revealed.
- "opportunity" = one clear, realistic main opportunity.
- "businessOpportunities" = 3 to 5 opportunities directly tied to this specific trend, not generic startup advice.
- "contentIdeas" = 3 to 5 content ideas that are specific enough to execute immediately for this trend.
- Forbidden generic formats: podcast, blog, newsletter, social media post, webinar, infographic, generic video series, influencer collaboration, generic advertising campaign.
- Content ideas must describe a precise angle, target audience, decision, comparison or scenario tied to this trend. Do not use the content format as the idea.
- Avoid vague phrases such as: surveiller cette tendance, capitaliser sur le buzz, créer du contenu autour de ce sujet, tirer parti de l'engouement, augmenter la visibilité.
- Do not include confidence score, internal reasoning, markdown, comments or extra JSON keys.
- Do not invent precise facts that are not supported by the title, source, category or score.`
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
      marketAnalysis: parsed.marketAnalysis || parsed.marketInterpretation || parsed.whyItMatters || '',
      businessOpportunities: ensureSpecificList(parsed.businessOpportunities, trend, buildBusinessFallbacks(trend)),
      contentIdeas: ensureSpecificList(parsed.contentIdeas, trend, buildContentFallbacks(trend))
    };
  } catch (error) {
    console.error("TREND AI ERROR:", error.response?.data || error.message);
    return buildFallbackTrendAnalysis(trend);
  }
};

const generateBatchAnalysis = async (trends) => {
  try {
    const prompt = trends.map((t, i) =>
      `${i + 1}. ${t.title} | Source: ${t.source || 'inconnue'} | Categorie: ${t.category || 'generale'} | Score: ${t.score || 0}`
    ).join("\n");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: 1200,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: `
Tu es un analyste marche senior. Pour chaque tendance ci-dessous, retourne une analyse courte en francais uniquement.

Objectif:
- Analyse: expliquer pourquoi la tendance gagne en visibilite et quel signal marche elle revele.
- Idee: proposer une opportunite concrete ou une idee de contenu exploitable, directement liee a la tendance.

Regles:
- Toutes les phrases doivent etre en francais.
- Aucun titre anglais.
- Aucun label anglais.
- Ne pas utiliser de phrases generiques.
- Ne pas proposer podcast, blog ou newsletter sauf si le titre le justifie clairement.
- Ne pas inventer de faits precis non presents dans le titre, la source, la categorie ou le score.

Format STRICT:
1. Analyse: ...
   Idee: ...

2. Analyse: ...
   Idee: ...

Tendances:
${prompt}
            `
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

    const text = response.data.choices[0].message.content;
    const parts = text.split(/\d+\.\s+/).filter(Boolean);

    return trends.map((trend, index) => {
      const part = parts[index] || "";

      const analysisMatch = part.match(/(?:Analyse|Analysis):\s*([\s\S]*?)(?:\n\s*(?:Idee|Idée|Idea):|$)/i);
      const ideaMatch = part.match(/(?:Idee|Idée|Idea):\s*([\s\S]*)/i);

      const analysis = analysisMatch ? analysisMatch[1].trim() : trend.analysis || "";
      const idea = ideaMatch ? ideaMatch[1].trim() : trend.idea || "";

      return {
        ...trend,
        analysis: analysis || `Cette tendance gagne en visibilite comme signal ${trend.source || 'de marche'} et merite une veille rapprochee pour comprendre son impact autour de "${trend.title}".`,
        idea: idea || `Preparer un angle de decision concret autour de "${trend.title}" afin d'aider le public concerne a agir rapidement.`
      };
    });

  } catch (error) {
    console.error("BATCH AI ERROR:", error.response?.data || error.message);

    return trends.map(trend => ({
      ...trend,
      analysis: trend.analysis || `Cette tendance montre une traction actuelle et merite d'etre suivie pour confirmer si l'interet devient durable.`,
      idea: trend.idea || `Preparer un angle de decision clair autour de "${trend.title}".`
    }));
  }
};

module.exports = { generateBatchAnalysis, generateTrendAnalysis };
