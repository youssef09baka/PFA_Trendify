/**
 * Script: Remove All SVG Placeholders from MongoDB
 * 
 * Purpose: Clean database of all data:image/svg+xml fallback placeholders
 * that were generated before SVG fallback removal
 * 
 * Removes SVG from:
 * - trend.image
 * - trend.thumbnail
 * - trend.poster
 * 
 * Execution: node backend/scripts/remove_svg_placeholders.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load configuration
const config = require(path.join(__dirname, '../config/config'));

// Import Trend model
const Trend = require(path.join(__dirname, '../models/Trend'));

const logger = {
  info: (msg, data = {}) => console.log(`[INFO] ${msg}`, data),
  warn: (msg, data = {}) => console.warn(`[WARN] ${msg}`, data),
  error: (msg, data = {}) => console.error(`[ERROR] ${msg}`, data),
};

async function removeSVGPlaceholders() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB successfully');

    logger.info('Starting SVG placeholder removal...');

    // Find all trends with SVG placeholders in image field
    const imageSVGCount = await Trend.countDocuments({
      image: { $regex: '^data:image/svg\\+xml' },
    });

    // Find all trends with SVG placeholders in thumbnail field
    const thumbnailSVGCount = await Trend.countDocuments({
      thumbnail: { $regex: '^data:image/svg\\+xml' },
    });

    // Find all trends with SVG placeholders in poster field
    const posterSVGCount = await Trend.countDocuments({
      poster: { $regex: '^data:image/svg\\+xml' },
    });

    logger.info('SVG placeholder detection complete', {
      imageField: imageSVGCount,
      thumbnailField: thumbnailSVGCount,
      posterField: posterSVGCount,
      totalFields: imageSVGCount + thumbnailSVGCount + posterSVGCount,
    });

    if (imageSVGCount === 0 && thumbnailSVGCount === 0 && posterSVGCount === 0) {
      logger.info('No SVG placeholders found. Database already clean.');
      await mongoose.connection.close();
      return;
    }

    logger.info('Removing SVG placeholders...');

    // Update all trends: clear image field if it contains SVG
    const imageUpdate = await Trend.updateMany(
      { image: { $regex: '^data:image/svg\\+xml' } },
      { $set: { image: '' } },
    );

    // Update all trends: clear thumbnail field if it contains SVG
    const thumbnailUpdate = await Trend.updateMany(
      { thumbnail: { $regex: '^data:image/svg\\+xml' } },
      { $set: { thumbnail: '' } },
    );

    // Update all trends: clear poster field if it contains SVG
    const posterUpdate = await Trend.updateMany(
      { poster: { $regex: '^data:image/svg\\+xml' } },
      { $set: { poster: '' } },
    );

    logger.info('SVG placeholder removal complete', {
      imageFieldUpdated: imageUpdate.modifiedCount,
      thumbnailFieldUpdated: thumbnailUpdate.modifiedCount,
      posterFieldUpdated: posterUpdate.modifiedCount,
      totalUpdated: imageUpdate.modifiedCount + thumbnailUpdate.modifiedCount + posterUpdate.modifiedCount,
    });

    // Verify all SVG placeholders are gone
    const verifyImage = await Trend.countDocuments({
      image: { $regex: '^data:image/svg\\+xml' },
    });
    const verifyThumbnail = await Trend.countDocuments({
      thumbnail: { $regex: '^data:image/svg\\+xml' },
    });
    const verifyPoster = await Trend.countDocuments({
      poster: { $regex: '^data:image/svg\\+xml' },
    });

    logger.info('Verification complete', {
      imageRemaining: verifyImage,
      thumbnailRemaining: verifyThumbnail,
      posterRemaining: verifyPoster,
      status: verifyImage === 0 && verifyThumbnail === 0 && verifyPoster === 0 ? '✅ SUCCESS' : '❌ FAILED',
    });

    if (verifyImage > 0 || verifyThumbnail > 0 || verifyPoster > 0) {
      logger.error('Verification failed - some SVG placeholders remain!');
      process.exit(1);
    }

    logger.info('✅ SVG Placeholder Removal Successful - Database is now clean');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during SVG placeholder removal', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
removeSVGPlaceholders();
