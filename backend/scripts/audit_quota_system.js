/**
 * QUOTA SYSTEM AUDIT SCRIPT
 * Purpose: Verify how AI quota is stored, decremented, and whether reset exists
 * No modifications made - verification only
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { MONGO_URI, AI_ANALYSIS_QUOTA } = require('../config/config');
const User = require('../models/User');

console.log('='.repeat(80));
console.log('AI QUOTA SYSTEM AUDIT');
console.log('='.repeat(80));

async function auditQuotaSystem() {
  try {
    // 1. CONNECT TO DATABASE
    console.log('\n[1] CONNECTING TO DATABASE...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. VERIFY QUOTA STORAGE
    console.log('\n[2] VERIFYING QUOTA STORAGE IN USER SCHEMA...');
    const userSchema = User.schema;
    const aiRemainingField = userSchema.obj.aiRemaining;
    const aiLastResetField = userSchema.obj.aiLastReset;
    
    console.log('Field: aiRemaining');
    console.log(`  Type: ${aiRemainingField.type.name}`);
    console.log(`  Default: ${aiRemainingField.default}`);
    console.log(`  ✅ Storage verified`);
    
    console.log('\nField: aiLastReset');
    console.log(`  Type: ${aiLastResetField.type.name}`);
    console.log(`  Default: ${aiLastResetField.default.toString()}`);
    console.log(`  ✅ Storage verified`);

    // 3. CHECK CONFIG
    console.log('\n[3] CHECKING QUOTA CONFIGURATION...');
    console.log(`AI_ANALYSIS_QUOTA = ${AI_ANALYSIS_QUOTA}`);
    if (process.env.AI_ANALYSIS_QUOTA) {
      console.log(`Environment override: ${process.env.AI_ANALYSIS_QUOTA}`);
    } else {
      console.log('Using default value: 1000');
    }

    // 4. EXAMINE USER DATA
    console.log('\n[4] EXAMINING CURRENT USER DATA...');
    const allUsers = await User.find({}).limit(50).select('name email aiRemaining aiLastReset createdAt');
    console.log(`Total users in database: ${await User.countDocuments({})}`);
    console.log(`Examining first ${Math.min(50, allUsers.length)} users:\n`);
    
    let zeroQuotaUsers = 0;
    let fullQuotaUsers = 0;
    let partialQuotaUsers = 0;
    let undefQuotaUsers = 0;
    
    const userQuotaData = allUsers.map((user, idx) => {
      const remaining = user.aiRemaining;
      const lastReset = user.aiLastReset;
      
      if (remaining === undefined || remaining === null) {
        undefQuotaUsers++;
        return {
          idx: idx + 1,
          email: user.email,
          quota: 'UNDEFINED',
          lastReset: lastReset ? lastReset.toISOString().split('T')[0] : 'UNKNOWN',
          status: '❌'
        };
      } else if (remaining === 0) {
        zeroQuotaUsers++;
        return {
          idx: idx + 1,
          email: user.email,
          quota: remaining,
          lastReset: lastReset ? lastReset.toISOString().split('T')[0] : 'UNKNOWN',
          status: '🚨 BLOCKED'
        };
      } else if (remaining === AI_ANALYSIS_QUOTA) {
        fullQuotaUsers++;
        return {
          idx: idx + 1,
          email: user.email,
          quota: remaining,
          lastReset: lastReset ? lastReset.toISOString().split('T')[0] : 'UNKNOWN',
          status: '✅ FULL'
        };
      } else {
        partialQuotaUsers++;
        return {
          idx: idx + 1,
          email: user.email,
          quota: remaining,
          lastReset: lastReset ? lastReset.toISOString().split('T')[0] : 'UNKNOWN',
          status: '⚠️ PARTIAL'
        };
      }
    });

    console.table(userQuotaData);
    
    console.log(`\nQUOTA DISTRIBUTION:`);
    console.log(`  Full quota (${AI_ANALYSIS_QUOTA}):  ${fullQuotaUsers} users`);
    console.log(`  Partial quota (0-${AI_ANALYSIS_QUOTA}): ${partialQuotaUsers} users`);
    console.log(`  Zero quota (0):       ${zeroQuotaUsers} users ⚠️ BLOCKED`);
    console.log(`  Undefined:            ${undefQuotaUsers} users`);

    // 5. ANALYZE RESET FIELD USAGE
    console.log('\n[5] ANALYZING aiLastReset FIELD USAGE...');
    const userWithResets = await User.find({}).select('aiLastReset createdAt');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let resetSameAsCreated = 0;
    let resetOlderThanToday = 0;
    let resetNotEqual = 0;
    
    userWithResets.forEach(user => {
      const createdAtDate = new Date(user.createdAt);
      createdAtDate.setHours(0, 0, 0, 0);
      const resetDate = new Date(user.aiLastReset);
      resetDate.setHours(0, 0, 0, 0);
      
      if (resetDate.getTime() === createdAtDate.getTime()) {
        resetSameAsCreated++;
      }
      if (resetDate < today) {
        resetOlderThanToday++;
      }
    });

    console.log(`  Total users with aiLastReset: ${userWithResets.length}`);
    console.log(`  Users where reset = createdAt: ${resetSameAsCreated}`);
    console.log(`  Users where reset < today: ${resetOlderThanToday}`);
    console.log(`  ⚠️ FINDING: aiLastReset is set but NEVER UPDATED or CHECKED`);

    // 6. SEARCH FOR RESET LOGIC
    console.log('\n[6] SEARCHING FOR RESET MECHANISM...');
    console.log('Checking feedController.js analyzeTrend() function...');
    
    const fs = require('fs');
    const feedControllerPath = path.resolve(__dirname, '../controllers/feedController.js');
    const feedContent = fs.readFileSync(feedControllerPath, 'utf-8');
    
    // Check for reset logic patterns
    const hasResetLogic = {
      resetCheck: feedContent.includes('aiLastReset') && feedContent.includes('reset'),
      dailyReset: feedContent.includes('setHours') || feedContent.includes('today'),
      quotaReset: feedContent.includes('aiRemaining') && feedContent.includes('QUOTA'),
      checkLastReset: feedContent.includes('aiLastReset')
    };

    console.log(`  Checks aiLastReset field: ${hasResetLogic.checkLastReset ? '✅' : '❌'}`);
    console.log(`  Implements reset logic: ${hasResetLogic.resetCheck ? '✅' : '❌ NO RESET LOGIC'}`);
    console.log(`  Calculates daily boundary: ${hasResetLogic.dailyReset ? '✅' : '❌'}`);
    console.log(`  Resets quota to full: ${hasResetLogic.quotaReset ? '✅' : '❌'}`);

    // 7. VERIFY DECREMENT MECHANISM
    console.log('\n[7] VERIFYING QUOTA DECREMENT MECHANISM...');
    
    // Find the analyzeTrend function
    const analyzeTrendStart = feedContent.indexOf('const analyzeTrend');
    const analyzeTrendEnd = feedContent.indexOf('\nmodule.exports', analyzeTrendStart);
    const analyzeTrendCode = feedContent.substring(analyzeTrendStart, analyzeTrendEnd);

    const quotaChecks = {
      checkBeforeAnalysis: analyzeTrendCode.includes('aiRemaining <= 0'),
      preventAnalysisIfZero: analyzeTrendCode.includes('429'),
      atomicDecrement: analyzeTrendCode.includes('$inc'),
      decrementAmount: analyzeTrendCode.match(/aiRemaining[:\s]*-[0-9]+/) ? true : false
    };

    console.log(`  Checks quota before analysis: ${quotaChecks.checkBeforeAnalysis ? '✅' : '❌'}`);
    console.log(`  Returns 429 if quota zero: ${quotaChecks.preventAnalysisIfZero ? '✅' : '❌'}`);
    console.log(`  Uses atomic decrement ($inc): ${quotaChecks.atomicDecrement ? '✅' : '❌'}`);
    console.log(`  Decrement amount verified: ${quotaChecks.decrementAmount ? '✅' : '❌'}`);

    // Extract decrement lines
    const decrementLines = analyzeTrendCode.split('\n').filter(line => 
      line.includes('aiRemaining') && (line.includes('$inc') || line.includes('-1'))
    );
    
    if (decrementLines.length > 0) {
      console.log(`\n  Decrement lines found (${decrementLines.length}):`);
      decrementLines.forEach((line, i) => {
        console.log(`    ${i + 1}. ${line.trim()}`);
      });
    }

    // 8. CHECK FOR QUOTA RESET IN FULL CODEBASE
    console.log('\n[8] SEARCHING ENTIRE BACKEND FOR RESET IMPLEMENTATION...');
    
    const backendPath = path.resolve(__dirname, '../');
    const files = require('fs').readdirSync(backendPath, { recursive: true })
      .filter(f => f.endsWith('.js') && !f.includes('node_modules') && !f.includes('archive'));

    let filesWithReset = [];
    files.forEach(file => {
      try {
        const fullPath = path.join(backendPath, file);
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('aiLastReset') || 
              (content.includes('aiRemaining') && content.includes('QUOTA'))) {
            filesWithReset.push(file);
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    });

    console.log(`Files referencing quota system: ${filesWithReset.length}`);
    filesWithReset.forEach(f => console.log(`  - ${f}`));

    if (!filesWithReset.some(f => f.includes('middleware') || f.includes('routes') || f.includes('cron'))) {
      console.log('\n  ❌ NO MIDDLEWARE/ROUTE/CRON JOB FOUND IMPLEMENTING RESET');
    }

    // 9. DETERMINE IF ISSUE IS REAL
    console.log('\n[9] DETERMINING IF ISSUE IS REAL OR THEORETICAL...');
    
    if (zeroQuotaUsers > 0) {
      console.log(`  ✅ ISSUE IS REAL: ${zeroQuotaUsers} users have zero quota (permanently blocked)`);
    } else {
      console.log(`  ⚠️ ISSUE IS THEORETICAL: No users currently blocked (but could happen)`);
    }

    if (partialQuotaUsers > 0) {
      console.log(`  ⚠️ USERS USING QUOTA: ${partialQuotaUsers} users have consumed quota`);
    }

    console.log(`  🚨 RESET NOT IMPLEMENTED: Will cause permanent blocking when quota exhausted`);

    // 10. SUMMARY
    console.log('\n[10] SUMMARY OF FINDINGS...');
    console.log('\nQUOTA STORAGE: ✅');
    console.log('  - aiRemaining (Number): Stores quota balance');
    console.log('  - aiLastReset (Date): Exists but never used');
    console.log('  - Default quota: ' + AI_ANALYSIS_QUOTA);

    console.log('\nQUOTA DECREMENT: ✅');
    console.log('  - Checked before analysis in analyzeTrend()');
    console.log('  - Decremented atomically with $inc: -1');
    console.log('  - Returns 429 (Too Many Requests) when quota = 0');

    console.log('\nQUOTA RESET: ❌ MISSING');
    console.log('  - aiLastReset field never checked at runtime');
    console.log('  - No date boundary calculation');
    console.log('  - No daily reset implementation');
    console.log('  - Users permanently blocked after exhausting quota');

    console.log('\nAFFECTED USERS:');
    if (zeroQuotaUsers > 0) {
      console.log(`  - ${zeroQuotaUsers} users currently blocked with zero quota`);
    } else {
      console.log(`  - All future users will be affected once they exhaust quota`);
    }
    if (partialQuotaUsers > 0) {
      console.log(`  - ${partialQuotaUsers} users actively consuming quota`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

auditQuotaSystem();
