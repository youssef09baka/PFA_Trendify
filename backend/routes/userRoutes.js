const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { registerUser, loginUser, updatePreferences } = require("../controllers/userController");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please wait 15 minutes." }
});

router.post("/signup", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.put("/preferences", protect, updatePreferences);

router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;