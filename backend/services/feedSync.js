const { getRealTrends } = require("./data");
const { saveTrends, scoreTrends } = require("./trendService");
const { TREND_PERSIST_LIMIT } = require("../config/config");
const mongoose = require('mongoose');

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

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

    const scored = scoreTrends(raw);
    const toPersist = scored.slice(0, Math.max(300, Number(TREND_PERSIST_LIMIT || 1000)));

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const persisted = await saveTrends(toPersist);
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
  const resolvedIntervalMs = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS;
  const intervalMinutes = Math.round(resolvedIntervalMs / (60 * 1000));

  // run immediately
  runSync().catch((e) => console.error('[SYNC] immediate run failed', e));
  timer = setInterval(() => runSync().catch((e) => console.error('[SYNC] scheduled run failed', e)), resolvedIntervalMs);
  console.info(`[SYNC] started, intervalMs=${resolvedIntervalMs}, intervalMinutes=${intervalMinutes}, next scheduled run in ${intervalMinutes} minutes`);
};

const stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.info('[SYNC] stopped');
  }
};

module.exports = { start, stop, runSync, DEFAULT_INTERVAL_MS };
