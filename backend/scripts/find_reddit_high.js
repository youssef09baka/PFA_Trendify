const mongoose = require('mongoose');
const config = require('../config/config');
const Trend = require('../models/Trend');

async function main() {
  await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const highs = await Trend.find({ source: /reddit/i, ml_prediction: 'HIGH' }).limit(20).lean();
  console.log('Found HIGH count:', highs.length);
  highs.forEach((h, i) => console.log(`${i+1}. id:${h._id} title:${h.title}`));
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
