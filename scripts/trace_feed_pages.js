require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const connectDB = require('../backend/config/db');
const { getFeedTrends } = require('../backend/services/trendService');

(async () => {
  try {
    await connectDB();
    for (let p = 1; p <= 10; p++) {
      const res = await getFeedTrends({ page: p, limit: 24 });
      const items = res.data || [];
      const totalVisible = items.length;
      const first = items[0] || null;
      const last = items[items.length - 1] || null;
      // removed during cleanup
      if (first) console.log(`  first_id=${first._id || first.id} | first_title=${first.title}`);
      if (last) console.log(`  last_id=${last._id || last.id} | last_title=${last.title}`);
    }
  } catch (err) {
    console.error('Failed to trace feed pages', err.message || err);
  } finally {
    process.exit(0);
  }
})();
