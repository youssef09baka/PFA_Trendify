require("dotenv").config();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4173";
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://ml:5001/predict";
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d";

if (!MONGO_URI) {
  throw new Error("Missing required environment variable: MONGO_URI");
}

if (!JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

module.exports = {
  PORT,
  NODE_ENV,
  MONGO_URI,
  JWT_SECRET,
  JWT_EXPIRATION,
  ML_SERVICE_URL,
  FRONTEND_URL
};