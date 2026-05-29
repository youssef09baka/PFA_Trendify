require('dotenv').config();

const connectDB = require('../config/db');
const Trend = require('../models/Trend');

const main = async () => {
  await connectDB();

  const candidates = await Trend.countDocuments({
    $or: [
      { image: '' },
      { image: null },
      { image: { $exists: false } }
    ],
    thumbnail: { $exists: true, $ne: '' }
  });

  console.info(`[MEDIA-REPAIR] legacy-image candidates: ${candidates}`);

  if (candidates === 0) {
    console.info('[MEDIA-REPAIR] no legacy image records required repair.');
    process.exit(0);
  }

  const result = await Trend.updateMany(
    {
      $or: [
        { image: '' },
        { image: null },
        { image: { $exists: false } }
      ],
      thumbnail: { $exists: true, $ne: '' }
    },
    [
      {
        $set: {
          image: {
            $cond: [
              { $or: [{ $eq: ['$image', ''] }, { $eq: ['$image', null] }, { $eq: ['$image', undefined] }] },
              '$thumbnail',
              '$image'
            ]
          },
          thumbnail: { $ifNull: ['$thumbnail', '$image'] },
          mediaType: 'image',
          mediaVerifiedAt: new Date(),
          mediaSource: 'legacy-repair'
        }
      }
    ],
    { new: true }
  );

  console.info('[MEDIA-REPAIR] update result', {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    acknowledged: result.acknowledged
  });

  process.exit(0);
};

main().catch((error) => {
  console.error('[MEDIA-REPAIR] failed', error);
  process.exit(1);
});
