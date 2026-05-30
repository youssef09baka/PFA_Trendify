const mongoose = require('mongoose');
const Trend = require('../models/Trend');
const { generateMlFeatures } = require('../services/featureGenerator');
const { MONGO_URI = 'mongodb://127.0.0.1:27017/trend_predictor' } = process.env;

const buildBackfill = (trend) => {
  const enriched = generateMlFeatures(trend);
  return {
    num_comments: enriched.num_comments,
    post_length: enriched.post_length,
    hour: enriched.hour,
    title_length: enriched.title_length,
    sentiment: enriched.sentiment
  };
};

(async () => {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const query = {
    $or: [
      { num_comments: { $exists: false } },
      { post_length: { $exists: false } },
      { hour: { $exists: false } },
      { title_length: { $exists: false } },
      { sentiment: { $exists: false } },
      { num_comments: null },
      { post_length: null },
      { hour: null },
      { title_length: null },
      { sentiment: null }
    ]
  };

  const docs = await Trend.find(query).lean();
  console.log('Found documents needing backfill:', docs.length);

  let repaired = 0;
  for (const trend of docs) {
    const updates = buildBackfill(trend);
    const shouldUpdate = Object.values(updates).some((value, index) => {
      const keys = ['num_comments','post_length','hour','title_length','sentiment'];
      return trend[keys[index]] !== value;
    });

    if (!shouldUpdate) continue;

    await Trend.updateOne({ _id: trend._id }, { $set: updates });
    repaired += 1;
  }

  console.log('Backfill complete. Documents repaired:', repaired);
  await mongoose.disconnect();
})();
