const app = require("./app");
const { PORT } = require("./config/config");
const { start } = require("./services/feedSync");
const logger = require("./utils/logger");

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  // Start background feed synchronization (non-blocking)
  try {
    start();
  } catch (err) {
    logger.error('[SYNC] failed to start feed sync:', err.message || err);
  }
});
