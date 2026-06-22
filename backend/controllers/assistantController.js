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

  const result = await askAssistant(message);

  res.status(200).json({
    success: true,
    data: {
      answer: result.answer,
      status: result.status,
      trendsUsed: result.trendsUsed
    }
  });
});

module.exports = { chatWithAssistant };
