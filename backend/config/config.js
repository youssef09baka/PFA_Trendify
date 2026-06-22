require("dotenv").config();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4173";
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d";
const PLACEHOLDER_IMAGE = process.env.PLACEHOLDER_IMAGE || 'https://via.placeholder.com/800x450?text=No+Image';

// Temporary dev/testing quota increase: keep this configurable so the limit can be raised or lowered safely.
const AI_ANALYSIS_QUOTA = Number(process.env.AI_ANALYSIS_QUOTA || 1000);
const TREND_INGEST_LIMIT = Number(process.env.TREND_INGEST_LIMIT || 5000);
const TREND_PERSIST_LIMIT = Number(process.env.TREND_PERSIST_LIMIT || 1000);
const TREND_CACHE_DURATION_MS = Number(process.env.TREND_CACHE_DURATION_MS || 10 * 60 * 1000);
const REDDIT_FETCH_LIMIT = Number(process.env.REDDIT_FETCH_LIMIT || 75);
const REDDIT_MAX_RETRIES = Number(process.env.REDDIT_MAX_RETRIES || 3);
const REDDIT_DISABLED_SUBREDDITS = process.env.REDDIT_DISABLED_SUBREDDITS || 'entertainment,cybersecurity,space';
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || '';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || '';
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'Trendify/1.0 (+https://trendify.local)';
const GOOGLE_TRENDS_LIMIT = Number(process.env.GOOGLE_TRENDS_LIMIT || 120);
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
  FRONTEND_URL,
  PLACEHOLDER_IMAGE,
  AI_ANALYSIS_QUOTA,
  TREND_INGEST_LIMIT,
  TREND_PERSIST_LIMIT,
  TREND_CACHE_DURATION_MS,
  REDDIT_FETCH_LIMIT,
  REDDIT_MAX_RETRIES,
  REDDIT_DISABLED_SUBREDDITS,
  REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET,
  REDDIT_USERNAME,
  REDDIT_PASSWORD,
  REDDIT_USER_AGENT,
  GOOGLE_TRENDS_LIMIT,
  GROQ_API_KEY,
  GROQ_MODEL
};
