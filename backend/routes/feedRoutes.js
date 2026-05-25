const express = require("express");
const router = express.Router();

const { getFeed } = require("../controllers/feedController");
const { saveTrend, unsaveTrend } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getFeed);
router.post('/:id/save', protect, saveTrend);
router.delete('/:id/save', protect, unsaveTrend);

module.exports = router;