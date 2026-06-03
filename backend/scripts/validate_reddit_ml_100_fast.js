const mongoose = require('mongoose');
const config = require('../config/config');
const Trend = require('../models/Trend');
const { predictTrend } = require('../services/mlService');

async function main() {
  await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const trends = await Trend.find({ source: /reddit/i }).sort({ updatedAt: -1 }).limit(200).lean();
  const sample = trends.slice(0, 100);

  const results = [];

  for (const t of sample) {
    const item = {
      id: String(t._id),
      title: t.title,
      stored_ml_before: t.ml_prediction
    };

    try {
      const predict = await predictTrend(t);
      item.predictTrend = predict;
    } catch (err) {
      item.predictTrend = `ERROR:${err.message}`;
    }

    results.push(item);
  }

  const counts = results.reduce((acc, r) => {
    const v = r.predictTrend || r.stored_ml_before || 'UNAVAILABLE';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  const total = results.length;
  const percentages = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, ((v / total) * 100).toFixed(2)]));

  console.log('\nFAST VALIDATION RESULTS (100 trends):\n');
  console.log('Total sampled:', total);
  console.log('Counts:', counts);
  console.log('Percentages:', percentages);

  const highExamples = results.filter(r => r.predictTrend === 'HIGH').slice(0, 5);
  const lowExamples = results.filter(r => r.predictTrend === 'LOW').slice(0, 5);

  console.log('\n5 HIGH examples (by predictTrend):');
  highExamples.forEach((h, i) => console.log(`${i+1}. id:${h.id} title:${h.title}`));

  console.log('\n5 LOW examples (by predictTrend):');
  lowExamples.forEach((h, i) => console.log(`${i+1}. id:${h.id} title:${h.title}`));

  const fs = require('fs');
  const outPath = 'backend/scripts/validate_reddit_ml_100_fast_report.json';
  fs.writeFileSync(outPath, JSON.stringify({ results, counts, percentages, highExamples, lowExamples }, null, 2));
  console.log('\nWrote fast report to', outPath);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
