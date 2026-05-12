const axios = require("axios");

const evaluateTrend = async (trend) => {
  try {
    if (!trend || !trend.title) {
      return {
        relevance: 50,
        credibility: 50,
        businessPotential: 50,
      };
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an AI trend evaluator. Analyze the trend and return ONLY valid JSON.",
          },
          {
            role: "user",
            content: `
Analyze this trend:
"${trend.title}"

Give:
- relevance score from 0 to 100
- credibility score from 0 to 100
- business potential from 0 to 100

Rules:
- Technology and AI sources are usually more credible
- Sensational or controversial topics are less credible
- Business opportunities should have high businessPotential

Return ONLY JSON like this:
{
  "relevance": 80,
  "credibility": 70,
  "businessPotential": 90
}
`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 7000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;

    const parsed = JSON.parse(content);

    return {
      relevance: parsed.relevance || 50,
      credibility: parsed.credibility || 50,
      businessPotential: parsed.businessPotential || 50,
    };
  } catch (error) {
    console.error("AI EVALUATOR ERROR:", error.message);

    return {
      relevance: 50,
      credibility: 50,
      businessPotential: 50,
    };
  }
};

module.exports = { evaluateTrend };