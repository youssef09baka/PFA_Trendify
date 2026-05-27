const axios = require("axios");

const generateBatchAnalysis = async (trends) => {
  try {
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
    const parts = text.split(/\d+\.\s+/).filter(Boolean);

    return trends.map((trend, index) => {
      const part = parts[index] || "";

      const analysisMatch = part.match(/Analysis:\s*([\s\S]*?)(?:\n\s*Idea:|$)/i);
      const ideaMatch = part.match(/Idea:\s*([\s\S]*)/i);

      return {
        ...trend,
        analysis: analysisMatch ? analysisMatch[1].trim() : (trend.analysis || ""),
        idea: ideaMatch ? ideaMatch[1].trim() : (trend.idea || "")
      };
    });

  } catch (error) {
    console.error("BATCH AI ERROR:", error.response?.data || error.message);

    return trends.map(trend => ({
      ...trend,
      analysis: trend.analysis || "",
      idea: trend.idea || ""
    }));
  }
};

module.exports = { generateBatchAnalysis };