const app = require("./app");
const { PORT } = require("./config/config");
const { start } = require("./services/feedSync");

app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
  // Start background feed synchronization (non-blocking)
  try {
    start();
  } catch (err) {
    console.error('[SYNC] failed to start feed sync:', err.message || err);
  }
});