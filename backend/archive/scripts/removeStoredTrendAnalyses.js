const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Trend = require('../../models/Trend');

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI');
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const before = await Trend.countDocuments({
    $or: [
      { analysis: { $exists: true } },
      { idea: { $exists: true } }
    ]
  });

  const result = await Trend.updateMany(
    {},
    {
      $unset: {
        analysis: '',
        idea: ''
      }
    }
  );

  const after = await Trend.countDocuments({
    $or: [
      { analysis: { $exists: true } },
      { idea: { $exists: true } }
    ]
  });

  console.log(JSON.stringify({
    matched: result.matchedCount,
    modified: result.modifiedCount,
    documentsWithStoredAnalysisBefore: before,
    documentsWithStoredAnalysisAfter: after
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
