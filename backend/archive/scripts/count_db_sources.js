require('dotenv').config();
const mongoose = require('mongoose');
const Trend = require('../models/Trend');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trend_predictor', {
      serverSelectionTimeoutMS: 10000
    });

    const counts = await Trend.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const total = await Trend.countDocuments();
    console.log(JSON.stringify({ total, counts }, null, 2));
  } catch (err) {
    console.error('DB_ERROR', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
