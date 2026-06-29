const express = require("express");
const router = express.Router();

const { getFeed, getTrendDetail, analyzeTrend } = require("../controllers/feedController");
const { repairMedia } = require("../controllers/mediaController");
const { saveTrend, unsaveTrend } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getFeed);
router.post('/repair-media', protect, repairMedia);
router.get('/:id', protect, getTrendDetail);
router.post('/:id/analyze', protect, analyzeTrend);
router.post('/:id/save', protect, saveTrend);
router.delete('/:id/save', protect, unsaveTrend);

module.exports = router; 

