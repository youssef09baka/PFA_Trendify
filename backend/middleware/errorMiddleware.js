const logger = require('../utils/logger');
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || "Server Error"
  };

  if (err.status) {
    payload.status = err.status;
  }

  if (process.env.NODE_ENV === "development" && err.status !== "ai_unavailable") {
    payload.stack = err.stack;
  }

  const logMessage = `[ERROR] ${req.method} ${req.originalUrl} ${statusCode} - ${err.message}`;
  if (statusCode >= 500) {
    logger.error(logMessage);
  } else {
    logger.warn(logMessage);
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
