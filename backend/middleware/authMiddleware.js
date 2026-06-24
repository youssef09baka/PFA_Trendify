const logger = require('../utils/logger');
/**
 * Authentication Middleware
 * Protects routes with JWT validation and manages daily AI analysis quota reset.
 * Ensures user identity verification and enforces usage limits.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, AI_ANALYSIS_QUOTA } = require("../config/config");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    const error = new Error("Not authorized, no token provided");
    error.statusCode = 401;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      const error = new Error("Invalid authentication token");
      error.statusCode = 401;
      return next(error);
    }

    req.user = await User.findById(decoded.id).select("-password -__v");

    if (!req.user) {
      const error = new Error("Not authorized, user not found");
      error.statusCode = 401;
      return next(error);
    }

    // Defensive: Initialize missing quota fields with defaults
    if (typeof req.user.aiRemaining !== 'number') {
      req.user.aiRemaining = AI_ANALYSIS_QUOTA;
    }

    // Check if daily reset is due (compare calendar dates, not just 24-hour window)
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let lastResetDate = null;
      let isInvalidDate = false;

      // Try to parse aiLastReset if it exists
      if (req.user.aiLastReset) {
        try {
          lastResetDate = new Date(req.user.aiLastReset);
          // Validate that the date is valid
          if (isNaN(lastResetDate.getTime())) {
            isInvalidDate = true;
            lastResetDate = null;
          }
        } catch (err) {
          isInvalidDate = true;
          lastResetDate = null;
        }
      }

      // If lastReset is invalid, missing, or from a previous day, reset the quota
      if (!lastResetDate || isInvalidDate) {
        // Missing or invalid date: reset quota
        req.user.aiRemaining = AI_ANALYSIS_QUOTA;
        req.user.aiLastReset = new Date();
        await req.user.save().catch(() => null);
      } else {
        // Normalize last reset date to midnight for comparison
        const lastResetNormalized = new Date(lastResetDate);
        lastResetNormalized.setHours(0, 0, 0, 0);

        // If last reset was on a previous day, reset quota
        if (lastResetNormalized < today) {
          req.user.aiRemaining = AI_ANALYSIS_QUOTA;
          req.user.aiLastReset = new Date();
          await req.user.save().catch(() => null);
        }
      }
    } catch (err) {
      // Fail silently on reset logic error to not block authentication
      logger.error('Error in AI quota reset logic:', err.message);
    }

    return next();
  } catch (err) {
    const error = new Error("Not authorized, token invalid or expired");
    error.statusCode = 401;
    return next(error);
  }
};

module.exports = { protect };