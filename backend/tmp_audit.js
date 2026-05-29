require('dotenv').config();
const mongoose = require('mongoose');
const Trend = require('./models/Trend');
(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trend_predictor', { serverSelectionTimeoutMS: 10000 });
  const total = await Trend.countDocuments();
  const hasImage = await Trend.countDocuments({ image: { $type: 'string', $ne: '' } });
  const imageBlank = await Trend.countDocuments({ image: '' });
  const thumbnailBlank = await Trend.countDocuments({ thumbnail: '' });
  const placeholder = await Trend.countDocuments({ $or: [ { image: /via\.placeholder\.com|text=No\+Image|placeholder\.com|images\.unsplash\.com/i }, { thumbnail: /via\.placeholder\.com|text=No\+Image|placeholder\.com|images\.unsplash\.com/i } ] });
  console.log(JSON.stringify({ total, hasImage, imageBlank, thumbnailBlank, placeholder }, null, 2));
  await mongoose.disconnect();
})().catch(async (err) => { console.error(err); await mongoose.disconnect().catch(()=>{}); process.exitCode=1; });
