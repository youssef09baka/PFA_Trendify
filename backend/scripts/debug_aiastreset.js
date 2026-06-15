/**
 * Debug script to verify defensive handling of missing aiLastReset
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { MONGO_URI } = require("../config/config");

async function debug() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create a test user
    const testUser = new User({
      name: "Debug User",
      email: "debug_missing_reset@example.com",
      password: "hashedpassword123",
      aiRemaining: 300
    });
    await testUser.save();
    console.log("1. Created user with aiRemaining=300");
    console.log(`   aiLastReset: ${testUser.aiLastReset}`);
    console.log(`   typeof aiLastReset: ${typeof testUser.aiLastReset}`);

    // Unset aiLastReset
    await User.updateOne(
      { _id: testUser._id },
      { $unset: { aiLastReset: 1 } }
    );
    console.log("\n2. Unset aiLastReset");

    // Query user directly from DB
    const userAfterUnset = await User.findById(testUser._id);
    console.log(`   aiLastReset after unset: ${userAfterUnset.aiLastReset}`);
    console.log(`   typeof aiLastReset: ${typeof userAfterUnset.aiLastReset}`);
    console.log(`   aiLastReset === undefined: ${userAfterUnset.aiLastReset === undefined}`);
    console.log(`   !aiLastReset: ${!userAfterUnset.aiLastReset}`);

    // Check raw MongoDB document
    const rawDoc = await mongoose.connection.collection('users').findOne({ _id: testUser._id });
    console.log(`\n3. Raw MongoDB document:`);
    console.log(`   aiLastReset in raw doc: ${rawDoc.aiLastReset}`);

    // Cleanup
    await User.deleteOne({ _id: testUser._id });
    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err.message);
    await mongoose.connection.close();
  }
}

debug();
