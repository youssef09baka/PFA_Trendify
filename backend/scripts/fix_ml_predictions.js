const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { MONGO_URI } = require('../config/config');
const Trend = require('../models/Trend');
const { predictTrend } = require('../services/mlService');

const run = async () => {
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  // Reddit: find stale values (UNKNOWN, null, or missing)
  const redditFilter = {
    source: /reddit/i,
    $or: [
      { ml_prediction: 'UNKNOWN' },
      { ml_prediction: null },
      { ml_prediction: { $exists: false } }
    ]
  };

  const redditDocs = await Trend.find(redditFilter).lean();
  console.log('Found reddit docs to repair:', redditDocs.length);

  let redditUpdated = 0;
  for (const doc of redditDocs) {
    try {
      const pred = await predictTrend(doc);
      await Trend.updateOne({ _id: doc._id }, { $set: { ml_prediction: pred, updatedAt: new Date() } });
      redditUpdated += 1;
      console.log('Repaired reddit', doc._id.toString(), '->', pred);
    } catch (err) {
      console.warn('Failed to predict for', doc._id.toString(), err.message || err);
      try {
        await Trend.updateOne({ _id: doc._id }, { $set: { ml_prediction: 'UNAVAILABLE', updatedAt: new Date() } });
      } catch (e) {}
    }
  }

  // Google Trends: clear stale persisted predictions
  const googleFilter = { source: /google/i, ml_prediction: { $ne: null } };
  const googleResult = await Trend.updateMany(googleFilter, { $set: { ml_prediction: null, updatedAt: new Date() } });
  const googleCleaned = googleResult.modifiedCount || googleResult.nModified || 0;

  console.log('Reddit repaired count:', redditUpdated);
  console.log('Google cleaned count:', googleCleaned);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
