const mongoose = require('mongoose');
const Trend = require('../models/Trend');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('[AUDIT] Analyzing detailed prediction issues...\n');
    
    // Find trends with empty string predictions
    const emptyPredictions = await Trend.find({ ml_prediction: '' }).limit(20).lean();
    console.log(`[EMPTY_PREDICTIONS] Found ${(await Trend.countDocuments({ ml_prediction: '' }))} trends with empty string prediction`);
    if (emptyPredictions.length > 0) {
      console.log('Examples:');
      emptyPredictions.slice(0, 5).forEach(t => {
        console.log(`  - "${t.title}" (score: ${t.score}, source: ${t.source})`);
      });
    }
    
    // Find trends with UNKNOWN predictions
    const unknownPredictions = await Trend.find({ ml_prediction: 'UNKNOWN' }).limit(20).lean();
    console.log(`\n[UNKNOWN_PREDICTIONS] Found ${(await Trend.countDocuments({ ml_prediction: 'UNKNOWN' }))} trends with UNKNOWN prediction`);
    if (unknownPredictions.length > 0) {
      console.log('Examples:');
      unknownPredictions.slice(0, 5).forEach(t => {
        console.log(`  - "${t.title}" (score: ${t.score}, source: ${t.source})`);
      });
    }
    
    // Find trends with HIGH score but no good prediction
    const highScoreBadPred = await Trend.find({
      $and: [
        { score: { $gte: 70 } },
        { ml_prediction: { $in: ['', 'UNAVAILABLE', 'UNKNOWN', null] } }
      ]
    }).limit(10).lean();
    console.log(`\n[HIGH_SCORE_BAD_PRED] Found ${(await Trend.countDocuments({
      $and: [
        { score: { $gte: 70 } },
        { ml_prediction: { $in: ['', 'UNAVAILABLE', 'UNKNOWN', null] } }
      ]
    }))} trends with high score but bad prediction`);
    console.log('Examples:');
    highScoreBadPred.forEach(t => {
      console.log(`  - "${t.title}" (score: ${t.score}, prediction: "${t.ml_prediction}", source: ${t.source})`);
    });
    
    // Check source distribution of bad predictions
    const badPredBySource = await Trend.aggregate([
      {
        $match: {
          $or: [
            { ml_prediction: '' },
            { ml_prediction: 'UNKNOWN' },
            { ml_prediction: null }
          ]
        }
      },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log(`\n[BAD_PREDICTIONS_BY_SOURCE]`);
    badPredBySource.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });
    
    // Check score distribution by prediction value
    const scoreDist = await Trend.aggregate([
      { $group: {
          _id: '$ml_prediction',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
          minScore: { $min: '$score' },
          maxScore: { $max: '$score' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    console.log(`\n[SCORE_DISTRIBUTION_BY_PREDICTION]`);
    scoreDist.forEach(item => {
      console.log(`  "${item._id}": count=${item.count}, avg=${item.avgScore.toFixed(2)}, min=${item.minScore}, max=${item.maxScore}`);
    });
    
    // Check if Google Trends have predictions
    const googleTrends = await Trend.find({ source: 'Google Trends' }).limit(50).lean();
    const googleWithPred = googleTrends.filter(t => String(t.ml_prediction || '').trim() && t.ml_prediction !== 'UNAVAILABLE');
    console.log(`\n[GOOGLE_TRENDS_ANALYSIS]`);
    console.log(`  Total sampled: ${googleTrends.length}`);
    console.log(`  With valid prediction: ${googleWithPred.length}`);
    console.log(`  Prediction coverage: ${((googleWithPred.length / googleTrends.length) * 100).toFixed(1)}%`);
    
  } catch (err) {
    console.error('[ERROR]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
