const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateTrendCredibility } = require("../services/credibilityService");

test("trusted editorial links can be marked verified", () => {
  const result = evaluateTrendCredibility({
    title: "NASA announces Artemis update",
    source: "Google Trends",
    category: "Science",
    link: "https://www.nasa.gov/news/artemis-update"
  });

  assert.equal(result.verificationStatus, "verified");
  assert.equal(result.confidence, "high");
  assert.equal(result.isFakeNews, false);
  assert.equal(result.verifiedSources[0].domain, "nasa.gov");
});

test("community trends without evidence are not marked verified", () => {
  const result = evaluateTrendCredibility({
    title: "Rumor says secret cure exposed",
    source: "Reddit",
    category: "Health",
    link: "https://reddit.com/r/example/comments/1"
  });

  assert.notEqual(result.verificationStatus, "verified");
  assert.equal(result.verifiedSources.length, 0);
  assert.equal(result.confidence, "low");
  assert.equal(result.isFakeNews, true);
});
