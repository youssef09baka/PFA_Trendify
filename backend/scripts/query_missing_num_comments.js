const mongoose = require('mongoose');
const config = require('../config/config');

(async () => {
  try {
    await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const col = mongoose.connection.db.collection('trends');
    const docs = await col.find({ source: /reddit/i, num_comments: { $exists: false } }).sort({ createdAt: 1 }).limit(5).toArray();
    console.log('found', docs.length);
    docs.forEach(d => console.log(String(d._id), 'createdAt=', d.createdAt, 'updatedAt=', d.updatedAt, 'title=', (d.title || '').slice(0, 120)));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
