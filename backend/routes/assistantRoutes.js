const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { chatWithAssistant } = require("../controllers/assistantController");

router.post("/chat", protect, chatWithAssistant);

module.exports = router;
