const isVerboseLoggingEnabled = () => (
  process.env.DEBUG_LOGS === 'true' || (process.env.NODE_ENV || 'production') !== 'production'
);

const info = (...args) => {
  if (isVerboseLoggingEnabled()) console.info(...args);
};

const warn = (...args) => {
  if (isVerboseLoggingEnabled()) console.warn(...args);
};

const error = (...args) => {
  console.error(...args);
};

module.exports = {
  info,
  warn,
  error,
  isVerboseLoggingEnabled
};
