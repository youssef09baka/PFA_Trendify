const mongoose = require('mongoose');
const config = require('../config/config');
const Trend = require('../models/Trend');
const { predictTrend } = require('../services/mlService');
const axios = require('axios');

const AUTH_TOKEN = process.env.VALIDATION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTlmOGJjZTllMTljM2NmZDMwMTZlZiIsImlhdCI6MTc4MDE1MTk4NSwiZXhwIjoxNzgwNzU2Nzg1fQ.Hp3bvFZEFBQ3upa0vwvuV7EoYs-buRcLMMm267ZAMN0';

async function main() {
  await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const trends = await Trend.find({ source: /reddit/i }).sort({ updatedAt: -1 }).limit(12).lean();
  const sample = trends.slice(0, 10);

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

    // Call analyze endpoint (will refresh/persist ml_prediction for Reddit)
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

  // Summary counts
  const counts = results.reduce((acc, r) => {
    const v = r.stored_ml_after || r.api_ml || r.predictTrend || 'UNAVAILABLE';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  console.log('\nVALIDATION RESULTS:\n');
  results.forEach((r, i) => {
    console.log(`--[${i+1}]-------------------------------------------------`);
    console.log(`title: ${r.title}`);
    console.log(`id: ${r.id}`);
    console.log(`source: ${r.source}`);
    console.log(`num_comments: ${r.num_comments}`);
    console.log(`post_length: ${r.post_length}`);
    console.log(`hour: ${r.hour}`);
    console.log(`title_length: ${r.title_length}`);
    console.log(`sentiment: ${r.sentiment}`);
    console.log(`predictTrend(): ${r.predictTrend}`);
    console.log(`stored_ml_before: ${r.stored_ml_before}`);
    console.log(`api_ml (analyze response): ${r.api_ml}`);
    console.log(`stored_ml_after: ${r.stored_ml_after}`);
    console.log(`consistent: ${r.consistent}`);
  });

  console.log('\nSUMMARY COUNTS:', counts);

  // Save a JSON report
  const fs = require('fs');
  fs.writeFileSync('backend/scripts/validate_reddit_ml_report.json', JSON.stringify({ results, counts }, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
