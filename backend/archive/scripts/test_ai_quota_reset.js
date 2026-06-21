/**
 * AI Quota Reset Feature - Runtime Verification Tests
 * 
 * Test A: User from today - quota must NOT reset
 * Test B: User from previous day - quota MUST reset
 * Test C: User with aiRemaining=0 and old aiLastReset - user regains full quota
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { JWT_SECRET, AI_ANALYSIS_QUOTA, MONGO_URI } = require("../config/config");
const jwt = require("jsonwebtoken");

// Import the authMiddleware to test the reset logic
const { protect } = require("../middleware/authMiddleware");

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

const logResult = (testName, passed, message) => {
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`\n${status}: ${testName}`);
  console.log(`   ${message}`);
  testResults.tests.push({ testName, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
};

const createMockRequest = () => ({
  headers: {},
  user: null
});

const createMockResponse = () => ({
  status: () => ({
    json: () => {}
  })
});

const createMockNext = () => (error) => {
  if (error) throw error;
};

async function runTests() {
  try {
    console.log("=".repeat(70));
    console.log("AI QUOTA RESET FEATURE - RUNTIME VERIFICATION");
    console.log("=".repeat(70));

    // Connect to MongoDB
    console.log("\nConnecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✓ Connected to MongoDB");

    // Clean up test users from previous runs
    console.log("\nCleaning up test data...");
    await User.deleteMany({
      email: { $regex: "^test_quota_" }
    });
    console.log("✓ Cleaned up previous test data");

    // Create test users
    console.log("\nCreating test users...");

    // Test A: User with quota from today
    const todayDate = new Date();
    const testUserA = new User({
      name: "Test User A",
      email: "test_quota_today@example.com",
      password: "hashedpassword123",
      aiRemaining: 500,
      aiLastReset: todayDate
    });
    await testUserA.save();
    console.log(`✓ Created Test User A (aiRemaining=500, aiLastReset=today)`);

    // Test B: User with quota from previous day
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const testUserB = new User({
      name: "Test User B",
      email: "test_quota_yesterday@example.com",
      password: "hashedpassword123",
      aiRemaining: 750,
      aiLastReset: yesterdayDate
    });
    await testUserB.save();
    console.log(`✓ Created Test User B (aiRemaining=750, aiLastReset=yesterday)`);

    // Test C: User with depleted quota and old reset
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    const testUserC = new User({
      name: "Test User C",
      email: "test_quota_depleted@example.com",
      password: "hashedpassword123",
      aiRemaining: 0,
      aiLastReset: oldDate
    });
    await testUserC.save();
    console.log(`✓ Created Test User C (aiRemaining=0, aiLastReset=20 days ago)`);

    // Wait a moment for data to be synced
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log("\n" + "=".repeat(70));
    console.log("RUNNING TESTS");
    console.log("=".repeat(70));

    // TEST A: User from today - quota must NOT reset
    console.log("\n--- Test A: User from today (quota must NOT reset) ---");
    {
      const req = createMockRequest();
      const res = createMockResponse();
      const token = jwt.sign({ id: testUserA._id }, JWT_SECRET, { expiresIn: "7d" });
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, createMockNext());

      const aiRemainingBefore = testUserA.aiRemaining;
      const freshUser = await User.findById(testUserA._id);

      const passed =
        freshUser.aiRemaining === aiRemainingBefore &&
        freshUser.aiRemaining === 500;

      logResult(
        "Test A: User from today",
        passed,
        `Expected aiRemaining=500 (unchanged), got ${freshUser.aiRemaining}. aiLastReset=${freshUser.aiLastReset.toISOString()}`
      );
    }

    // TEST B: User from previous day - quota MUST reset
    console.log("\n--- Test B: User from previous day (quota MUST reset) ---");
    {
      const req = createMockRequest();
      const res = createMockResponse();
      const token = jwt.sign({ id: testUserB._id }, JWT_SECRET, { expiresIn: "7d" });
      req.headers.authorization = `Bearer ${token}`;

      const aiRemainingBefore = testUserB.aiRemaining;
      await protect(req, res, createMockNext());

      const freshUser = await User.findById(testUserB._id);

      const passed =
        freshUser.aiRemaining === AI_ANALYSIS_QUOTA &&
        freshUser.aiRemaining !== aiRemainingBefore;

      logResult(
        "Test B: User from previous day",
        passed,
        `Expected aiRemaining=${AI_ANALYSIS_QUOTA} (reset from ${aiRemainingBefore}), got ${freshUser.aiRemaining}. aiLastReset updated to=${freshUser.aiLastReset.toISOString()}`
      );
    }

    // TEST C: User with aiRemaining=0 and old aiLastReset - user regains full quota
    console.log("\n--- Test C: Depleted quota from old date (must reset to full) ---");
    {
      const req = createMockRequest();
      const res = createMockResponse();
      const token = jwt.sign({ id: testUserC._id }, JWT_SECRET, { expiresIn: "7d" });
      req.headers.authorization = `Bearer ${token}`;

      const aiRemainingBefore = testUserC.aiRemaining;
      await protect(req, res, createMockNext());

      const freshUser = await User.findById(testUserC._id);

      const passed =
        freshUser.aiRemaining === AI_ANALYSIS_QUOTA &&
        freshUser.aiRemaining > aiRemainingBefore;

      logResult(
        "Test C: Depleted quota reset",
        passed,
        `Expected aiRemaining=${AI_ANALYSIS_QUOTA} (reset from ${aiRemainingBefore}), got ${freshUser.aiRemaining}. User regains full quota. aiLastReset updated to=${freshUser.aiLastReset.toISOString()}`
      );
    }

    // Defensive test: Far future date as aiLastReset (edge case)
    console.log("\n--- Defensive Test: aiLastReset in far future (should reset if date is invalid after calc) ---");
    {
      const testUserEdge = new User({
        name: "Test User Edge",
        email: "test_quota_edge_reset@example.com",
        password: "hashedpassword123",
        aiRemaining: 300,
        aiLastReset: new Date("2099-12-31")  // Far future
      });
      await testUserEdge.save();

      const req = createMockRequest();
      const res = createMockResponse();
      const token = jwt.sign({ id: testUserEdge._id }, JWT_SECRET, { expiresIn: "7d" });
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, createMockNext());

      const freshUser = await User.findById(testUserEdge._id);

      // Far future date should NOT reset (it's still in the future)
      const passed = freshUser.aiRemaining === 300;

      logResult(
        "Defensive: Future date preserves quota",
        passed,
        `Expected aiRemaining=300 (no reset), got ${freshUser.aiRemaining}. Far future dates should not trigger reset.`
      );
    }

    // Defensive test: Missing aiRemaining
    console.log("\n--- Defensive Test: Missing aiRemaining (should initialize) ---");
    {
      const testUserMissingRemaining = new User({
        name: "Test User Missing Remaining",
        email: "test_quota_missing_remaining@example.com",
        password: "hashedpassword123",
        aiLastReset: new Date()
        // aiRemaining intentionally omitted (will be undefined)
      });
      // Manually set to undefined to simulate missing field
      await testUserMissingRemaining.save();
      await User.updateOne(
        { _id: testUserMissingRemaining._id },
        { $unset: { aiRemaining: 1 } }
      );

      const req = createMockRequest();
      const res = createMockResponse();
      const token = jwt.sign({ id: testUserMissingRemaining._id }, JWT_SECRET, { expiresIn: "7d" });
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, createMockNext());

      const freshUser = await User.findById(testUserMissingRemaining._id);

      const passed =
        freshUser.aiRemaining === AI_ANALYSIS_QUOTA &&
        typeof freshUser.aiRemaining === 'number';

      logResult(
        "Defensive: Missing aiRemaining",
        passed,
        `Expected aiRemaining to be initialized to ${AI_ANALYSIS_QUOTA}, got ${freshUser.aiRemaining}`
      );
    }

    // Clean up test users
    console.log("\n\nCleaning up test data...");
    await User.deleteMany({
      email: { $regex: "^test_quota_" }
    });
    console.log("✓ Cleaned up test data");

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("TEST SUMMARY");
    console.log("=".repeat(70));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✓ Passed: ${testResults.passed}`);
    console.log(`✗ Failed: ${testResults.failed}`);
    console.log("=".repeat(70));

    testResults.tests.forEach(test => {
      const status = test.passed ? "✓" : "✗";
      console.log(`${status} ${test.testName}`);
    });

    console.log("\n" + "=".repeat(70));
    if (testResults.failed === 0) {
      console.log("🎉 ALL TESTS PASSED!");
    } else {
      console.log(`⚠️  ${testResults.failed} TEST(S) FAILED`);
    }
    console.log("=".repeat(70));

  } catch (err) {
    console.error("❌ Error running tests:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
    process.exit(testResults.failed === 0 ? 0 : 1);
  }
}

// Run tests
runTests();
