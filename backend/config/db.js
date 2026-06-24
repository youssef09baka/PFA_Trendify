const mongoose = require("mongoose");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      autoIndex: false,
      family: 4
    });
    logger.info(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`[DB] MongoDB error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
