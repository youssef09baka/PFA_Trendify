const { URL } = require("url");

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const TRUSTED_DOMAINS = [
  { domain: "reuters.com", label: "Reuters", categories: ["Business", "Finance", "World"] },
  { domain: "apnews.com", label: "Associated Press", categories: ["World", "Politics", "Business"] },
  { domain: "bbc.com", label: "BBC", categories: ["World", "Tech", "Science"] },
  { domain: "bbc.co.uk", label: "BBC", categories: ["World", "Tech", "Science"] },
  { domain: "theverge.com", label: "The Verge", categories: ["Tech", "Gaming"] },
  { domain: "techcrunch.com", label: "TechCrunch", categories: ["Tech", "Startups", "Business"] },
  { domain: "wired.com", label: "Wired", categories: ["Tech", "Science"] },
  { domain: "nature.com", label: "Nature", categories: ["Science", "Health"] },
  { domain: "nih.gov", label: "NIH", categories: ["Health", "Science"] },
  { domain: "who.int", label: "WHO", categories: ["Health", "Science"] },
  { domain: "sec.gov", label: "SEC", categories: ["Finance", "Business"] },
  { domain: "nasa.gov", label: "NASA", categories: ["Science", "Space"] },
  { domain: "gamespot.com", label: "GameSpot", categories: ["Gaming"] },
  { domain: "ign.com", label: "IGN", categories: ["Gaming", "Entertainment"] },
  { domain: "polygon.com", label: "Polygon", categories: ["Gaming", "Entertainment"] }
];

const SOURCE_TRUST = {
  "Google Trends": {
    score: 68,
    confidence: "medium",
    verificationStatus: "partially_verified",
    explanation: "Google Trends confirme l'existence d'un pic de recherche, mais ne valide pas la veracite du contenu."
  },
  Reddit: {
    score: 46,
    confidence: "low",
    verificationStatus: "unverified",
    explanation: "Reddit est un signal communautaire utile pour detecter l'attention, mais il ne constitue pas une preuve editoriale."
  }
};

const HIGH_RISK_PATTERNS = [
  /\b(fake|hoax|scam|fraud|conspiracy|deepfake|misinformation|rumou?r|leak(?:ed)?|unverified)\b/i,
  /\b(100% true|shocking proof|doctors hate|secret cure|guaranteed)\b/i,
  /\b(urgent|breaking)\b.*\b(unverified|rumou?r|leak)\b/i
];

const SENSATIONAL_PATTERNS = [
  /\b(shocking|exposed|you won't believe|insane|destroyed|panic|collapse)\b/i,
  /!{2,}/
];

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const extractDomain = (link) => {
  try {
    const parsed = new URL(String(link || ""));
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
};

const matchTrustedDomain = (link) => {
  const domain = extractDomain(link);
  if (!domain) return null;

  return TRUSTED_DOMAINS.find((source) => (
    domain === source.domain || domain.endsWith(`.${source.domain}`)
  )) || null;
};

const getSourceBaseline = (source) => {
  const normalized = normalizeText(source).toLowerCase();
  if (normalized.includes("google")) return SOURCE_TRUST["Google Trends"];
  if (normalized.includes("reddit")) return SOURCE_TRUST.Reddit;
  return {
    score: 50,
    confidence: "low",
    verificationStatus: "unverified",
    explanation: "La source n'est pas reconnue comme source editoriale verifiee par le systeme."
  };
};

const detectRiskSignals = (trend) => {
  const text = `${trend.title || ""} ${trend.excerpt || ""} ${(trend.tags || []).join(" ")}`;
  const highRisk = HIGH_RISK_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const sensational = SENSATIONAL_PATTERNS.filter((pattern) => pattern.test(text)).length;

  return {
    highRisk,
    sensational,
    hasRisk: highRisk > 0 || sensational > 0
  };
};

const deriveConfidence = ({ trustedSource, riskSignals, sourceBaseline }) => {
  if (trustedSource && riskSignals.highRisk === 0) return "high";
  if (trustedSource || sourceBaseline.confidence === "medium") return "medium";
  return "low";
};

const deriveVerificationStatus = ({ trustedSource, riskSignals, sourceBaseline }) => {
  if (riskSignals.highRisk > 0 && !trustedSource) return "unverifiable";
  if (trustedSource && riskSignals.highRisk === 0) return "verified";
  if (trustedSource) return "partially_verified";
  return sourceBaseline.verificationStatus;
};

const buildExplanation = ({ trustedSource, sourceBaseline, riskSignals, status }) => {
  const parts = [];
  if (trustedSource) {
    parts.push(`Lien associe a une source reconnue: ${trustedSource.label}.`);
  } else {
    parts.push(sourceBaseline.explanation);
  }
  if (riskSignals.highRisk > 0) {
    parts.push("Le titre ou les metadonnees contiennent des marqueurs de risque informationnel.");
  } else if (riskSignals.sensational > 0) {
    parts.push("Le signal contient un vocabulaire sensationnaliste, donc la confiance reste prudente.");
  }
  if (status !== "verified") {
    parts.push("Le contenu n'est pas marque comme verifie faute de preuve editoriale directe.");
  }
  return parts.join(" ");
};

const evaluateTrendCredibility = (trend = {}) => {
  const trustedSource = matchTrustedDomain(trend.link);
  const sourceBaseline = getSourceBaseline(trend.source);
  const riskSignals = detectRiskSignals(trend);
  const verificationStatus = deriveVerificationStatus({ trustedSource, riskSignals, sourceBaseline });
  const confidence = deriveConfidence({ trustedSource, riskSignals, sourceBaseline });

  let score = trustedSource ? 82 : sourceBaseline.score;
  if (riskSignals.highRisk > 0) score -= 28;
  if (riskSignals.sensational > 0) score -= 10;
  if (verificationStatus === "verified") score += 6;
  if (verificationStatus === "unverifiable") score -= 12;

  const credibilityScore = clamp(Math.round(score));
  const isFakeNews = !trustedSource && riskSignals.highRisk > 0 && credibilityScore < 35;

  return {
    credibilityScore,
    confidence,
    verifiedSources: trustedSource ? [{
      name: trustedSource.label,
      domain: trustedSource.domain,
      reason: "Le lien de la tendance pointe vers une source reconnue."
    }] : [],
    verificationStatus,
    explanation: buildExplanation({ trustedSource, sourceBaseline, riskSignals, status: verificationStatus }),
    isFakeNews,
    signals: {
      source: normalizeText(trend.source) || "Unknown",
      domain: extractDomain(trend.link),
      highRiskMarkers: riskSignals.highRisk,
      sensationalMarkers: riskSignals.sensational
    }
  };
};

module.exports = {
  evaluateTrendCredibility,
  matchTrustedDomain,
  detectRiskSignals
};
