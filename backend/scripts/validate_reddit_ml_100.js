const mongoose = require('mongoose');
const config = require('../config/config');
const Trend = require('../models/Trend');
const { predictTrend } = require('../services/mlService');
const axios = require('axios');

const AUTH_TOKEN = process.env.VALIDATION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTlmOGJjZTllMTljM2NmZDMwMTZlZiIsImlhdCI6MTc4MDE1MTk4NSwiZXhwIjoxNzgwNzU2Nzg1fQ.Hp3bvFZEFBQ3upa0vwvuV7EoYs-buRcLMMm267ZAMN0';

async function main() {
  await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const trends = await Trend.find({ source: /reddit/i }).sort({ updatedAt: -1 }).limit(200).lean();
  const sample = trends.slice(0, 100);

  const results = [];

  for (const t of sample) {
    const item = {
      id: String(t._id),
      title: t.title,
      source: t.source,
      num_comments: t.num_comments,
      post_length: t.post_length,
      hour: t.hour,
      title_length: t.title_length,
      sentiment: t.sentiment,
      stored_ml_before: t.ml_prediction
    };

    try {
      const predict = await predictTrend(t);
      item.predictTrend = predict;
    } catch (err) {
      item.predictTrend = `ERROR:${err.message}`;
    }

    // Call analyze endpoint to ensure persisted value is refreshed
    try {
      const res = await axios.post(`${process.env.VALIDATION_API_BASE || 'http://localhost:3000'}/api/feed/${item.id}/analyze`, {}, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        timeout: 20000
      });
      item.api_ml = res.data?.trend?.ml_prediction ?? null;
    } catch (err) {
      item.api_ml = `ERROR:${err.message}`;
    }

    // Refresh DB stored value
    const fresh = await Trend.findById(item.id).lean();
    item.stored_ml_after = fresh ? fresh.ml_prediction : null;

    item.consistent = (item.predictTrend === item.stored_ml_after) && (item.predictTrend === item.api_ml);

    results.push(item);
  }

  // Summary counts (based on stored_ml_after primarily)
  const counts = results.reduce((acc, r) => {
    const v = r.stored_ml_after || r.api_ml || r.predictTrend || 'UNAVAILABLE';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  const total = results.length;
  const percentages = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, ((v / total) * 100).toFixed(2)]));

  console.log('\nVALIDATION RESULTS:\n');
  console.log('Total trends sampled:', total);
  console.log('Counts:', counts);
  console.log('Percentages:', percentages);

  // Collect examples
  const highExamples = results.filter(r => r.stored_ml_after === 'HIGH').slice(0, 5);
  const lowExamples = results.filter(r => r.stored_ml_after === 'LOW').slice(0, 5);

  console.log('\n5 HIGH examples (if any):');
  highExamples.forEach((h, i) => console.log(`${i+1}. id:${h.id} title:${h.title}`));

  console.log('\n5 LOW examples:');
  lowExamples.forEach((h, i) => console.log(`${i+1}. id:${h.id} title:${h.title}`));

  // Save a JSON report
  const fs = require('fs');
  const outPath = 'backend/scripts/validate_reddit_ml_100_report.json';
  fs.writeFileSync(outPath, JSON.stringify({ results, counts, percentages, highExamples, lowExamples }, null, 2));
  console.log('\nWrote report to', outPath);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
