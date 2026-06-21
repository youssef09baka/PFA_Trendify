const mongoose = require('mongoose');
const Trend = require('../models/Trend');
const { predictTrend } = require('../services/mlService');
require('dotenv').config();

const BATCH_SIZE = 100;

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('[MIGRATION] Starting data quality migration...\n');
    
    // Step 1: Normalize source field
    console.log('[STEP 1] Normalizing source field...');
    const updates1 = await Trend.updateMany(
      { source: { $in: ['google', 'Google', 'GOOGLE'] } },
      { $set: { source: 'Google Trends' } }
    );
    console.log(`  Updated ${updates1.modifiedCount} trends with normalized source\n`);
    
    // Step 2: Fix UNKNOWN predictions
    console.log('[STEP 2] Replacing UNKNOWN predictions with UNAVAILABLE...');
    const updates2 = await Trend.updateMany(
      { ml_prediction: 'UNKNOWN' },
      { $set: { ml_prediction: 'UNAVAILABLE' } }
    );
    console.log(`  Updated ${updates2.modifiedCount} trends with UNKNOWN → UNAVAILABLE\n`);
    
    // Step 3: Generate predictions for all trends with null/missing predictions
    console.log('[STEP 3] Generating predictions for trends with null/missing values...');
    const trendsToPredict = await Trend.find({
      $or: [
        { ml_prediction: { $exists: false } },
        { ml_prediction: null }
      ]
    }).lean();
    
    console.log(`  Found ${trendsToPredict.length} trends needing predictions`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches
    for (let i = 0; i < trendsToPredict.length; i += BATCH_SIZE) {
      const batch = trendsToPredict.slice(i, i + BATCH_SIZE);
      const batchOps = [];
      
      for (const trend of batch) {
        try {
          const prediction = await predictTrend(trend);
          // Normalize the prediction to HIGH, LOW, or UNAVAILABLE
          let predictionValue = 'UNAVAILABLE';
          if (prediction && prediction.classification) {
            const normalized = String(prediction.classification).toUpperCase();
            if (['HIGH', 'LOW'].includes(normalized)) {
              predictionValue = normalized;
            }
          }
          
          batchOps.push({
            updateOne: {
              filter: { _id: trend._id },
              update: { $set: { ml_prediction: predictionValue, updatedAt: new Date() } }
            }
          });
          successCount++;
        } catch (err) {
          console.error(`  Error predicting trend ${trend._id}:`, err.message);
          errorCount++;
          // Default to UNAVAILABLE on error
          batchOps.push({
            updateOne: {
              filter: { _id: trend._id },
              update: { $set: { ml_prediction: 'UNAVAILABLE', updatedAt: new Date() } }
            }
          });
        }
      }
      
      if (batchOps.length > 0) {
        await Trend.bulkWrite(batchOps);
        console.log(`  Processed batch ${i / BATCH_SIZE + 1}: ${successCount}/${batch.length} successful`);
      }
    }
    
    console.log(`\n  Total: ${successCount} successful, ${errorCount} errors\n`);
    
    // Step 4: Verify results
    console.log('[STEP 4] Verifying migration results...');
    const stats = await Trend.aggregate([
      { $group: {
          _id: '$ml_prediction',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('  Prediction distribution after migration:');
    stats.forEach(item => {
      console.log(`    "${item._id || 'null'}": ${item.count}`);
    });
    
    // Check source distribution
    const sourceDist = await Trend.aggregate([
      { $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n  Source distribution after migration:');
    sourceDist.forEach(item => {
      console.log(`    "${item._id}": ${item.count}`);
    });
    
    // Check HIGH/LOW consistency with scores
    const scoreConsistencyIssues = await Trend.countDocuments({
      $or: [
        { score: { $gte: 70 }, ml_prediction: { $nin: ['HIGH', 'UNAVAILABLE', 'LOW'] } },
        { score: { $gte: 70 }, ml_prediction: null }
      ]
    });
    
    console.log(`\n  Remaining score/prediction inconsistencies: ${scoreConsistencyIssues}`);
    
    console.log('\n[MIGRATION] Completed successfully!\n');
    
  } catch (err) {
    console.error('[ERROR]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
