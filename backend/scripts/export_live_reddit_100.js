const mongoose = require('mongoose');
const config = require('../config/config');
const Trend = require('../models/Trend');
const fs = require('fs');

async function main() {
  await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const trends = await Trend.find({ source: /reddit/i }).sort({ updatedAt: -1 }).limit(200).lean();
  const { generateMlFeatures } = require('../services/featureGenerator');

  const sample = trends.slice(0, 100).map(t => {
    const f = generateMlFeatures(t);
    return {
      id: String(t._id),
      num_comments: f.num_comments,
      post_length: f.post_length,
      hour: f.hour,
      title_length: f.title_length,
      sentiment: f.sentiment,
      ml_prediction: t.ml_prediction
    };
  });
  const path = require('path');
  const out = path.join(__dirname, 'live_reddit_100.json');
  fs.writeFileSync(out, JSON.stringify(sample, null, 2));
  console.log('Wrote', out);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
