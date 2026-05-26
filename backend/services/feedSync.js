const { getRealTrends } = require("./data");
const { generateBatchAnalysis } = require("./aiService");
const { predictTrend } = require("./mlService");
const { saveTrends } = require("./trendService");
const mongoose = require('mongoose');

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let timer = null;
let running = false;

const runSync = async () => {
  if (running) {
    console.info('[SYNC] previous run still active, skipping this cycle');
    return;
  }

  running = true;
  console.info('[SYNC] feed sync started');
  try {
    const raw = await getRealTrends();
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn('[SYNC] no trends fetched from sources');
      running = false;
      return;
    }

    const scored = raw.map((trend) => ({
      ...trend,
      score: typeof trend.score === 'number'
        ? trend.score
        : Math.round((Math.max(trend.popularity || 0, 0) * 0.7) + (Math.max(trend.growth || 0, 0) * 0.3))
    })).slice(0, 50);

    const enriched = await generateBatchAnalysis(scored);

    const predictions = await Promise.all(enriched.map((t) => predictTrend(t)));

    const withPredictions = enriched.map((t, i) => ({ ...t, ml_prediction: predictions[i] }));

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const persisted = await saveTrends(withPredictions);
      console.info(`[SYNC] feed sync completed — trends upserted: ${persisted.length}`);
    } else {
      console.warn('[SYNC] DB not connected - skipping persistence for this run');
    }
  } catch (err) {
    console.error('[SYNC] feed sync failed:', err.message || err);
  } finally {
    running = false;
  }
};

const start = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (timer) return;
  // run immediately
  runSync().catch((e) => console.error('[SYNC] immediate run failed', e));
  timer = setInterval(() => runSync().catch((e) => console.error('[SYNC] scheduled run failed', e)), intervalMs);
  console.info('[SYNC] started, intervalMs=', intervalMs);
};

const stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.info('[SYNC] stopped');
  }
};

module.exports = { start, stop, runSync };
