const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pfa_v1';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000/predict';

(async () => {
  console.log('MONGO_URI=', MONGO_URI);
  console.log('ML_SERVICE_URL=', ML_SERVICE_URL);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('trends');

  const title = 'DeAaron Fox Violently Fouls Shai GilgeousAlexander';
  console.log('Searching trend by exact title:', title);
  const trend = await coll.findOne({ title: title });
  if (!trend) {
    console.error('Trend not found by exact title; trying regex...');
    const trend2 = await coll.findOne({ title: { $regex: /DeAaron Fox Violently Fouls Shai GilgeousAlexander/i } });
    if (!trend2) {
      console.error('Trend still not found.');
      process.exit(2);
    }
    console.log('Found trend with regex.');
    await printTrend(trend2);
  } else {
    await printTrend(trend);
  }
  await mongoose.disconnect();
  process.exit(0);

  async function printTrend(trendDoc) {
    console.log('\n=== Trend Document ===');
    console.log(JSON.stringify(trendDoc, null, 2));

    const fields = ['num_comments', 'post_length', 'hour', 'title_length', 'sentiment'];
    console.log('\n=== ML Input Fields ===');
    fields.forEach((field) => {
      const value = Object.prototype.hasOwnProperty.call(trendDoc, field) ? trendDoc[field] : undefined;
      console.log(field + ':', value, typeof value);
    });

    const mlServicePath = path.resolve(__dirname, '..', 'services', 'mlService.js');
    const axiosModule = require('axios');
    const originalPost = axiosModule.post.bind(axiosModule);
    let called = false;
    axiosModule.post = async function (url, body, config) {
      called = true;
      console.log('\n=== ML Service Call ===');
      console.log('url=', url);
      console.log('body=', JSON.stringify(body, null, 2));
      console.log('config=', JSON.stringify(config, null, 2));
      try {
        const resp = await originalPost(url, body, config);
        console.log('ml response status=', resp.status);
        console.log('ml response data=', JSON.stringify(resp.data, null, 2));
        return resp;
      } catch (err) {
        console.error('ml axios error message=', err.message);
        if (err.response) {
          console.error('ml axios error status=', err.response.status);
          console.error('ml axios error data=', JSON.stringify(err.response.data, null, 2));
        }
        throw err;
      }
    };

    const { predictTrend } = require(mlServicePath);
    console.log('\n=== predictTrend() Execution ===');
    const result = await predictTrend(trendDoc);
    console.log('predictTrend result=', result);
    console.log('ML service called=', called);
  }
})();
