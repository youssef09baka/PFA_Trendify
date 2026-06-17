const axios = require("axios");

// 🔥 ancienne version (utile en fallback)
const generateAnalysis = async (trend) => {
  try {
    // 🔥 sécurité
    if (!trend || !trend.title) {
      return "No trend data available";
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Explain why this trend is growing and give one content idea: ${trend.title}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 7000 // 🔥 ajout
      }
    );

    return response.data?.choices?.[0]?.message?.content || "No AI response";

  } catch (error) {
    console.error("AI ERROR:", error.response?.data || error.message);
    return "AI analysis unavailable";
  }
};

// 🔥 VERSION OPTIMISÉE (BATCH)
const generateBatchAnalysis = async (trends) => {
  try {
    // 🔥 construire prompt propre
    const prompt = trends.map((t, i) => 
      `${i + 1}. ${t.title}`
    ).join("\n");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
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

    // 🔥 SPLIT intelligent
    const parts = text.split(/\d+\.\s+/).filter(Boolean);

    return trends.map((trend, index) => {
      const part = parts[index] || "";

      const analysisMatch = part.match(/Analysis:\s*(.*)/i);
      const ideaMatch = part.match(/Idea:\s*(.*)/i);

      return {
        ...trend,
        analysis: analysisMatch ? analysisMatch[1].trim() : "AI unavailable",
        idea: ideaMatch ? ideaMatch[1].trim() : "No idea available"
      };
    });

  } catch (error) {
    console.error("BATCH AI ERROR:", error.response?.data || error.message);

    // 🔥 fallback propre
    return trends.map(trend => ({
      ...trend,
      analysis: "AI unavailable",
      idea: "No idea available"
    }));
  }
};

module.exports = { generateAnalysis, generateBatchAnalysis };