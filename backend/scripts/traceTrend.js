const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pfa_v1';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000/predict';

(async () => {
  try {
    console.log('Connecting to Mongo:', MONGO_URI);
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to Mongo');

    const db = mongoose.connection.db;
    const coll = db.collection('trends');

    const titleQuery = { title: { $regex: /hurricanes vs canadiens/i } };
    const trend = await coll.findOne(titleQuery);
    if (!trend) {
      console.error('Trend not found with title matching "hurricanes vs canadiens"');
      process.exit(2);
    }

    console.log('\n--- Trend document from MongoDB ---');
    console.log(JSON.stringify(trend, null, 2));

    const fields = ['num_comments','post_length','hour','title_length','sentiment'];
    console.log('\n--- Fields used by ML model ---');
    fields.forEach(f => {
      console.log(f + ':', Object.prototype.hasOwnProperty.call(trend, f) ? trend[f] : '(missing)');
    });

    // Load mlService directly
    const mlServicePath = path.resolve(__dirname, '..', 'services', 'mlService.js');
    const mlService = require(mlServicePath);

    console.log('\nCalling predictTrend(trend) ...');
    const result = await mlService.predictTrend(trend);
    console.log('predictTrend returned:', result);

    console.log('\nAttempt direct POST to ML service at', ML_SERVICE_URL);
    try {
      const resp = await axios.post(ML_SERVICE_URL, {
        num_comments: trend.num_comments,
        post_length: trend.post_length,
        hour: trend.hour,
        title_length: trend.title_length,
        sentiment: trend.sentiment
      }, { timeout: 8000 });

      console.log('ML service response.data:', JSON.stringify(resp.data));
    } catch (err) {
      console.error('Error calling ML service:', err.message);
      if (err.response) console.error('Response status/data:', err.response.status, err.response.data);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Trace failed:', err);
    process.exit(1);
  }
})();
