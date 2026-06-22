const express = require("express");
const router = express.Router();

const { getFeed, searchTrends, getTrendDetail, analyzeTrend } = require("../controllers/feedController");
const { saveTrend, unsaveTrend } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getFeed);
router.get('/search', protect, searchTrends);
router.get('/:id', protect, getTrendDetail);
router.post('/:id/analyze', protect, analyzeTrend);
router.post('/:id/save', protect, saveTrend);
router.delete('/:id/save', protect, unsaveTrend);

module.exports = router;
