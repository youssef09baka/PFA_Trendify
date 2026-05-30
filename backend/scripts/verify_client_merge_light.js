require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Trend = require('../models/Trend');

const dedupe = (items = []) => {
  const seen = new Map();
  const out = [];
  for (const item of items) {
    const id = String(item?._id || item?.id || item?.slug || item?.title || '');
    if (!id || seen.has(id)) continue;
    seen.set(id, true);
    out.push(item);
  }
  return out;
};

(async () => {
  try {
    await connectDB();
    const limit = 24;
    const sortOption = { score: -1, updatedAt: -1 };
    const page1 = await Trend.find({}).sort(sortOption).skip(0).limit(limit).lean();
    // verification script removed during cleanup
    let merged = page1.slice();
    const originalPositions = new Map();
    merged.forEach((t, idx) => originalPositions.set(String(t._id), idx));

    for (let p = 2; p <= 10; p++) {
      const skip = (p - 1) * limit;
      const next = await Trend.find({}).sort(sortOption).skip(skip).limit(limit).lean();
      merged = dedupe([...merged, ...next]);
      for (const [id, originalIdx] of originalPositions.entries()) {
        const currentIdx = merged.findIndex((t) => String(t._id) === id);
        if (currentIdx !== originalIdx) {
          console.error(`Item moved: id=${id} original=${originalIdx} current=${currentIdx} on page ${p}`);
          process.exit(2);
        }
      }
      console.log(`After page ${p}: merged=${merged.length} first=${merged[0]?._id} last=${merged[merged.length-1]?._id}`);
    }

    console.log('Verification passed: no original items moved after appends');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed', err.message || err);
    process.exit(1);
  }
})();
