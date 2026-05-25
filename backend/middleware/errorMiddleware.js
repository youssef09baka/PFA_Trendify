const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || "Server Error"
  };

  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl} ${statusCode} - ${err.message}`);

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;