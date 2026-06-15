const mongoose = require('mongoose');
const Trend = require('../models/Trend');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pfa_v1';

(async () => {
  try {
    console.log('Connecting to', uri);
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const total = await Trend.countDocuments();
    const missingFeatures = await Trend.countDocuments({
      $or: [
        { num_comments: { $exists: false } },
        { post_length: { $exists: false } },
        { hour: { $exists: false } },
        { title_length: { $exists: false } },
        { sentiment: { $exists: false } }
      ]
    });
    const unavailable = await Trend.countDocuments({
      ml_prediction: { $in: ['UNKNOWN', 'UNAVAILABLE', null, ''] }
    });

    console.log('total:', total);
    console.log('missingFeatures:', missingFeatures);
    console.log('unavailablePredictions:', unavailable);
  } catch (error) {
    console.error('Audit failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
