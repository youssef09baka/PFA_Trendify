const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { getRedditTrends } = require('../services/data/redditService');
const { saveTrends } = require('../services/trendService');
const { predictTrend } = require('../services/mlService');
const Trend = require('../models/Trend');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('connected memory mongo', uri);

  const trends = await getRedditTrends();
  console.log('fetched trends count', trends.length);
  const sample = trends.slice(0, 3);
  const persisted = await saveTrends(sample);
  console.log('persisted count', persisted.length);

  const doc = await Trend.findOne({ slug: persisted[0].slug }).lean();
  console.log('stored document sample:', {
    title: doc.title,
    slug: doc.slug,
    source: doc.source,
    num_comments: doc.num_comments,
    post_length: doc.post_length,
    hour: doc.hour,
    title_length: doc.title_length,
    sentiment: doc.sentiment,
    ml_prediction: doc.ml_prediction,
    createdAt: doc.createdAt
  });

  const prediction = await predictTrend(doc);
  console.log('predictTrend result', prediction);

  const updated = await Trend.findByIdAndUpdate(
    doc._id,
    { $set: { ml_prediction: prediction, updatedAt: new Date() } },
    { new: true }
  ).lean();

  console.log('updated stored document ml_prediction:', {
    slug: updated.slug,
    ml_prediction: updated.ml_prediction,
    num_comments: updated.num_comments,
    post_length: updated.post_length,
    hour: updated.hour,
    title_length: updated.title_length,
    sentiment: updated.sentiment
  });

  await mongoose.disconnect();
  await mongod.stop();
})();
