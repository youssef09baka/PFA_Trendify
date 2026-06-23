const asyncHandler = require("../middleware/asyncHandler");
const { askAssistant } = require("../services/assistantService");

const chatWithAssistant = asyncHandler(async (req, res) => {
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Le message est requis."
    });
  }

  const result = await askAssistant(message, req.body?.context || {});

  res.status(200).json({
    success: true,
    data: {
      answer: result.answer,
      status: result.status,
      trendsUsed: result.trendsUsed,
      trends: Array.isArray(result.trends) ? result.trends : [],
      action: result.action || null,
      pendingAction: result.pendingAction || null,
      intent: result.intent || result.status,
      confidence: result.confidence || null
    }
  });
});

module.exports = { chatWithAssistant };
