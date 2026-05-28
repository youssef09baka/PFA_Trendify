require("dotenv").config();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4173";
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5000/predict";
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d";
const PLACEHOLDER_IMAGE = process.env.PLACEHOLDER_IMAGE || 'https://via.placeholder.com/800x450?text=No+Image';

// Temporary dev/testing quota increase: keep this configurable so the limit can be raised or lowered safely.
const AI_ANALYSIS_QUOTA = Number(process.env.AI_ANALYSIS_QUOTA || 1000);
const TREND_INGEST_LIMIT = Number(process.env.TREND_INGEST_LIMIT || 5000);
const TREND_PERSIST_LIMIT = Number(process.env.TREND_PERSIST_LIMIT || 1000);
const TREND_ANALYSIS_LIMIT = Number(process.env.TREND_ANALYSIS_LIMIT || 250);
const TREND_CACHE_DURATION_MS = Number(process.env.TREND_CACHE_DURATION_MS || 10 * 60 * 1000);
const REDDIT_FETCH_LIMIT = Number(process.env.REDDIT_FETCH_LIMIT || 75);
const GOOGLE_TRENDS_LIMIT = Number(process.env.GOOGLE_TRENDS_LIMIT || 120);

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
  FRONTEND_URL,
  PLACEHOLDER_IMAGE,
  AI_ANALYSIS_QUOTA,
  TREND_INGEST_LIMIT,
  TREND_PERSIST_LIMIT,
  TREND_ANALYSIS_LIMIT,
  TREND_CACHE_DURATION_MS,
  REDDIT_FETCH_LIMIT,
  GOOGLE_TRENDS_LIMIT
};