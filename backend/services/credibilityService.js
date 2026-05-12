const axios = require("axios");

const TRUSTED_SOURCES = {

  sport: [
    "beinsports.com",
    "espn.com",
    "skysports.com",
    "hesport.com"
  ],

  morocco: [
    "2m.ma",
    "aloula.ma",
    "hespress.com"
  ],

  tech: [
    "techcrunch.com",
    "theverge.com",
    "wired.com",
    "openai.com"
  ],

  business: [
    "forbes.com",
    "bloomberg.com",
    "businessinsider.com"
  ]
};

const detectCategory = (title) => {

  const lower = title.toLowerCase();

  if (
    lower.includes("football") ||
    lower.includes("soccer") ||
    lower.includes("nba") ||
    lower.includes("sport") ||
    lower.includes("match")
  ) {
    return "sport";
  }

  if (
    lower.includes("morocco") ||
    lower.includes("maroc") ||
    lower.includes("king") ||
    lower.includes("government")
  ) {
    return "morocco";
  }

  if (
    lower.includes("ai") ||
    lower.includes("technology") ||
    lower.includes("tech") ||
    lower.includes("openai")
  ) {
    return "tech";
  }

  return "business";
};

const verifyCredibility = async (trend) => {

  try {

    if (!trend || !trend.title) {

      return {
        credibilityScore: 50,
        verifiedSources: [],
        isFakeNews: false,
        warning: ""
      };
    }

    const category = detectCategory(
      trend.title
    );

    const trustedDomains =
      TRUSTED_SOURCES[category] || [];

    let credibilityScore = 40;

    const verifiedSources = [];

    for (const domain of trustedDomains) {

      try {

        const response = await axios.get(

          `https://www.google.com/search?q=${encodeURIComponent(

            trend.title + " site:" + domain

          )}`,

          {
            timeout: 3000,

            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          }
        );

        const html =
          response.data.toLowerCase();

        if (

          html.includes(

            trend.title
              .toLowerCase()
              .split(" ")[0]

          )

        ) {

          credibilityScore += 15;

          verifiedSources.push(domain);
        }

      } catch (err) {

        console.log(
          "Verification failed for",
          domain
        );
      }
    }

    credibilityScore = Math.min(
      credibilityScore,
      100
    );

    // 🔥 fake news detection

    let isFakeNews = false;

    let warning = "";

    if (
      credibilityScore < 50 &&
      verifiedSources.length === 0
    ) {

      isFakeNews = true;

      warning =
        "This trend may contain unverified or misleading information.";
    }

    return {

      credibilityScore,

      verifiedSources,

      isFakeNews,

      warning
    };

  } catch (error) {

    console.error(
      "CREDIBILITY ERROR:",
      error.message
    );

    return {

      credibilityScore: 50,

      verifiedSources: [],

      isFakeNews: false,

      warning: ""
    };
  }
};

module.exports = {
  verifyCredibility
};