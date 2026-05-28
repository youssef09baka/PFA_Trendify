const app = require("./app");
const { PORT } = require("./config/config");
const { start } = require("./services/feedSync");
const { backfillMissingTrendImages, repairPersistedDuplicateMedia } = require("./services/data/imageEnricher");

app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
  // Start background feed synchronization (non-blocking)
  try {
    start();
    backfillMissingTrendImages().catch((err) => console.error('[MEDIA] backfill failed:', err.message || err));
    repairPersistedDuplicateMedia({ force: true }).catch((err) => console.error('[MEDIA] duplicate repair failed:', err.message || err));
  } catch (err) {
    console.error('[SYNC] failed to start feed sync:', err.message || err);
  }
});