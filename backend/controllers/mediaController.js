const asyncHandler = require('../middleware/asyncHandler');
const { repairPersistedDuplicateMedia } = require('../services/data/imageEnricher');

const repairMedia = asyncHandler(async (req, res) => {
  const result = await repairPersistedDuplicateMedia({ force: true });
  res.status(200).json({
    success: true,
    repaired: result.repaired || 0,
    invalidated: result.invalidated || 0,
    scanned: result.scanned || 0,
    repeatedFallbackImages: result.repeatedFallbackImages || 0,
    message: 'Forced persisted media repair completed.'
  });
});

module.exports = { repairMedia };
