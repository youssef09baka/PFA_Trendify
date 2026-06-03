const mongoose = require('mongoose');
const config = require('../config/config');
const Trend = require('../models/Trend');

async function main() {
  await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const docs = await Trend.find({ source: /reddit/i }).sort({ updatedAt: -1 }).limit(2000).lean();
  const stats = { total: docs.length, missing: 0, null: 0, number_zero: 0, number_pos: 0, string: 0, object: 0, other: 0 };
  const objectExamples = [];
  for (const d of docs) {
    const v = d.num_comments;
    if (v === undefined) stats.missing++;
    else if (v === null) stats.null++;
    else if (typeof v === 'number') {
      if (v === 0) stats.number_zero++;
      else if (v > 0) stats.number_pos++;
      else stats.other++;
    } else if (typeof v === 'string') stats.string++;
    else if (typeof v === 'object') { stats.object++; objectExamples.push({id:String(d._id), num_comments:v, title:d.title}); }
    else stats.other++;
  }

  console.log('Num comments stats (sample size:', stats.total + ')');
  console.log(stats);
  console.log('\nObject examples (up to 5):');
  console.log(objectExamples.slice(0,5));

  await mongoose.disconnect();
}

main().catch(e=>{console.error(e);process.exit(1)});
