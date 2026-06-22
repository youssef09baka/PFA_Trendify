const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { registerUser, loginUser, updatePreferences, getSavedTrends } = require("../controllers/userController");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please wait 15 minutes." }
});

router.post("/signup", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.put("/preferences", protect, updatePreferences);

router.get("/profile", protect, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    preferences: req.user.preferences || [],
    savedTrends: req.user.savedTrends || [],
    aiRemaining: req.user.aiRemaining,
    aiLastReset: req.user.aiLastReset,
    createdAt: req.user.createdAt
  });
});

router.get('/saved-trends', protect, getSavedTrends);

module.exports = router;
