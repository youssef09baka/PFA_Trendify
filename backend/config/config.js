require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://ml:5001/predict"
};