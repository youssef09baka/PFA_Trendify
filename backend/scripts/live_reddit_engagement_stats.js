const mongoose = require('mongoose');
const config = require('../config/config');

function toNumber(v) {
  if (v === undefined || v === null) return NaN;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

(async () => {
  try {
    await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const col = mongoose.connection.db.collection('trends');
    const docs = await col.find({ source: /reddit/i }).sort({ updatedAt: -1 }).limit(100).toArray();

    const nums = [];
    const scores = [];
    let num_zero = 0, num_pos = 0, score_zero = 0, score_pos = 0;

    for (const d of docs) {
      const nc = toNumber(d.num_comments);
      const sc = toNumber(d.score);
      if (!Number.isNaN(nc)) nums.push(nc);
      if (!Number.isNaN(sc)) scores.push(sc);
      if (Number.isNaN(nc) || nc === 0) num_zero += 1; else if (nc > 0) num_pos += 1;
      if (Number.isNaN(sc) || sc === 0) score_zero += 1; else if (sc > 0) score_pos += 1;
    }

    const stats = (arr) => {
      if (!arr || arr.length === 0) return { min: null, max: null, mean: null, count: 0 };
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
      return { min, max, mean, count: arr.length };
    };

    const numStats = stats(nums);
    const scoreStats = stats(scores);

    console.log('\nLIVE REDDIT ENGAGEMENT (100 most recent trends)');
    console.log('num_comments ->', numStats);
    console.log('score        ->', scoreStats);
    console.log('\nCounts:');
    console.log('num_comments == 0 or missing:', num_zero);
    console.log('num_comments > 0:', num_pos);
    console.log('score == 0 or missing:', score_zero);
    console.log('score > 0:', score_pos);

    console.log('\n20 sample trends (most recent)');
    const sample = docs.slice(0,20);
    sample.forEach((d,i) => {
      const nc = Number.isFinite(Number(d.num_comments)) ? Number(d.num_comments) : null;
      const sc = Number.isFinite(Number(d.score)) ? Number(d.score) : null;
      console.log(`\n[${i+1}] id:${d._id}`);
      console.log(' title:', (d.title||'').replace(/\n/g,' ').slice(0,200));
      console.log(' num_comments:', nc, ' score:', sc, ' prediction:', d.ml_prediction);
    });

    // write JSON report
    const fs = require('fs');
    const out = { numStats, scoreStats, counts: { num_zero, num_pos, score_zero, score_pos }, sample: sample.map(d=>({ id:String(d._id), title:d.title, num_comments:d.num_comments, score:d.score, ml_prediction:d.ml_prediction })) };
    fs.writeFileSync(require('path').join(__dirname,'live_reddit_engagement_report.json'), JSON.stringify(out, null, 2));
    console.log('\nWrote backend/scripts/live_reddit_engagement_report.json');

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
