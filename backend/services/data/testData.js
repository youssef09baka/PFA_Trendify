const { getRealTrends } = require("./index");

(async () => {
  const trends = await getRealTrends();
  // Console output is only allowed for local debugging.
  // Remove or comment this file in production.
  console.info(`[DATA] testData loaded ${trends.length} trends`);
})();