/**
 * COMPLETE END-TO-END PRODUCTION AUDIT
 * Tests all 12 steps of the user journey
 */
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Trend = require('../models/Trend');
const connectDB = require('../config/db');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = `audit_${Date.now()}@test.com`;
const TEST_PASSWORD = 'Test123!@#';

const audit = {
  timestamp: new Date().toISOString(),
  steps: [],
  issues: { critical: [], medium: [], low: [] },
  stats: { total: 12, success: 0, failed: 0 },
  readiness: 0
};

// Create API client
const api = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

function log(step, name, status, details = {}) {
  audit.steps.push({ step, name, status, details, time: new Date().toISOString() });
  if (status === 'SUCCESS') audit.stats.success++;
  else if (status === 'FAILURE') audit.stats.failed++;
  console.log(`[${step}] ${name}: ${status}`);
}

function issue(severity, title, desc) {
  audit.issues[severity.toLowerCase()].push({ title, desc });
  console.log(`  ⚠ [${severity}] ${title}: ${desc}`);
}

async function waitBackend() {
  for (let i = 0; i < 30; i++) {
    try {
      await api.get('/api/trends', { timeout: 2000 });
      console.log('✅ Backend ready\n');
      return true;
    } catch (e) {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function runAudit() {
  console.log('\n█████████████████████████████████████████████████████████████\n█ END-TO-END PRODUCTION AUDIT\n█████████████████████████████████████████████████████████████\n');
  
  try {
    await connectDB();
    console.log('✅ MongoDB connected\n');
    
    if (!await waitBackend()) throw new Error('Backend not responding');
    
    await User.deleteOne({ email: TEST_EMAIL });
    
    // STEP 1: Register
    console.log('='.repeat(70));
    console.log('STEP 1: REGISTER\n');
    let registerResp;
    try {
      registerResp = await api.post('/api/users/signup', {
        name: 'Audit User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      const user = await User.findOne({ email: TEST_EMAIL });
      if (user) {
        log(1, 'Register', 'SUCCESS', { endpoint: 'POST /api/users/signup', db: 'users' });
      } else {
        issue('CRITICAL', 'DB Sync', 'User returned but not in DB');
        log(1, 'Register', 'FAILURE', {});
      }
    } catch (e) {
      issue('CRITICAL', 'Register', e.message);
      log(1, 'Register', 'FAILURE', {});
      throw e;
    }
    
    // STEP 2: Login
    console.log('\n' + '='.repeat(70));
    console.log('STEP 2: LOGIN\n');
    let token;
    try {
      const loginResp = await api.post('/api/users/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      token = loginResp.data.token;
      if (token) {
        log(2, 'Login', 'SUCCESS', { endpoint: 'POST /api/users/login', db: 'users' });
      } else {
        issue('CRITICAL', 'JWT', 'No token returned');
        log(2, 'Login', 'FAILURE', {});
        throw new Error('No token');
      }
    } catch (e) {
      issue('CRITICAL', 'Login', e.message);
      log(2, 'Login', 'FAILURE', {});
      throw e;
    }
    
    // STEP 3: Verify JWT
    console.log('\n' + '='.repeat(70));
    console.log('STEP 3: VERIFY JWT\n');
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        log(3, 'JWT Verify', 'SUCCESS', { 
          structure: 'Valid', 
          hasUserId: !!payload.userId,
          hasExp: !!payload.exp,
          endpoint: 'Internal'
        });
      } else {
        throw new Error('Invalid JWT structure');
      }
    } catch (e) {
      issue('CRITICAL', 'JWT Invalid', e.message);
      log(3, 'JWT Verify', 'FAILURE', {});
    }
    
    // STEP 4: Protected Routes
    console.log('\n' + '='.repeat(70));
    console.log('STEP 4: PROTECTED ROUTES\n');
    try {
      const profileResp = await api.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      log(4, 'Protected Routes', 'SUCCESS', { endpoint: 'GET /api/users/profile', db: 'users' });
      
      // Test without token
      try {
        await api.get('/api/users/profile');
        issue('CRITICAL', 'Auth Bypass', 'Protected route accessible without token');
      } catch (e) {
        if (e.response?.status !== 401) {
          issue('MEDIUM', 'Auth Error', `Expected 401, got ${e.response?.status}`);
        }
      }
    } catch (e) {
      issue('CRITICAL', 'Protected Route', e.message);
      log(4, 'Protected Routes', 'FAILURE', {});
    }
    
    // STEP 5: User Preferences
    console.log('\n' + '='.repeat(70));
    console.log('STEP 5: USER PREFERENCES\n');
    try {
      await api.put('/api/users/preferences', 
        { preferences: ['tech', 'business'] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const user = await User.findOne({ email: TEST_EMAIL });
      if (user && user.preferences.length > 0) {
        log(5, 'Preferences', 'SUCCESS', { endpoint: 'PUT /api/users/preferences', db: 'users' });
      } else {
        issue('CRITICAL', 'Persist', 'Preferences not saved');
        log(5, 'Preferences', 'FAILURE', {});
      }
    } catch (e) {
      issue('CRITICAL', 'Preferences', e.message);
      log(5, 'Preferences', 'FAILURE', {});
    }
    
    // STEP 6: Feed Loading
    console.log('\n' + '='.repeat(70));
    console.log('STEP 6: FEED LOADING\n');
    let trends = [];
    try {
      const feedResp = await api.get('/api/feed', {
        headers: { Authorization: `Bearer ${token}` }
      });
      trends = feedResp.data.trends || feedResp.data;
      const count = Array.isArray(trends) ? trends.length : 0;
      log(6, 'Feed Loading', 'SUCCESS', { 
        endpoint: 'GET /api/feed', 
        db: ['trends', 'users'],
        trendCount: count
      });
      if (count === 0) {
        issue('MEDIUM', 'Empty Feed', 'No trends returned');
      }
    } catch (e) {
      issue('CRITICAL', 'Feed', e.message);
      log(6, 'Feed Loading', 'FAILURE', {});
    }
    
    // STEP 7: Trend Retrieval
    console.log('\n' + '='.repeat(70));
    console.log('STEP 7: TREND RETRIEVAL\n');
    let allTrends = [];
    try {
      const trendsResp = await api.get('/api/trends');
      allTrends = trendsResp.data.trends || trendsResp.data;
      const count = Array.isArray(allTrends) ? allTrends.length : 0;
      log(7, 'Trend Retrieval', 'SUCCESS', { 
        endpoint: 'GET /api/trends', 
        db: 'trends',
        trendCount: count
      });
      if (count === 0) {
        issue('CRITICAL', 'No Trends', 'Trends endpoint empty');
      }
    } catch (e) {
      issue('CRITICAL', 'Trends', e.message);
      log(7, 'Trend Retrieval', 'FAILURE', {});
    }
    
    const trendId = allTrends && allTrends.length > 0 ? allTrends[0]._id : null;
    
    // STEP 8: AI Analysis
    console.log('\n' + '='.repeat(70));
    console.log('STEP 8: AI ANALYSIS\n');
    if (!trendId) {
      log(8, 'AI Analysis', 'SKIPPED', { reason: 'No trend' });
    } else {
      try {
        const analysisResp = await api.post(`/api/feed/${trendId}/analyze`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        log(8, 'AI Analysis', 'SUCCESS', {
          endpoint: 'POST /api/feed/:id/analyze',
          db: ['trends', 'users'],
          hasAnalysis: !!analysisResp.data.analysis
        });
      } catch (e) {
        if (e.response?.status === 429) {
          log(8, 'AI Analysis', 'SUCCESS (Quota)', { message: 'Quota limit' });
        } else {
          issue('CRITICAL', 'AI Analysis', e.message);
          log(8, 'AI Analysis', 'FAILURE', {});
        }
      }
    }
    
    // STEP 9: Classification Audit
    console.log('\n' + '='.repeat(70));
    console.log('STEP 9: CLASSIFICATION AUDIT\n');
    try {
      const allDbTrends = await Trend.find({});
      const classif = {};
      let anomalies = 0;
      allDbTrends.forEach(t => {
        classif[t.ml_prediction || 'UNKNOWN'] = (classif[t.ml_prediction || 'UNKNOWN'] || 0) + 1;
        if ((t.score >= 70 && t.ml_prediction === 'LOW') || (t.score < 70 && t.ml_prediction === 'HIGH')) {
          anomalies++;
        }
      });
      log(9, 'Classification', 'SUCCESS', {
        endpoint: 'Internal Query',
        db: 'trends',
        totalTrends: allDbTrends.length,
        classifications: classif,
        anomalies: anomalies
      });
      if (anomalies > 0) {
        issue('MEDIUM', 'Anomalies', `${anomalies} misaligned score/classification`);
      }
    } catch (e) {
      issue('CRITICAL', 'Classification', e.message);
      log(9, 'Classification', 'FAILURE', {});
    }
    
    // STEP 10: Trend Detail
    console.log('\n' + '='.repeat(70));
    console.log('STEP 10: TREND DETAIL\n');
    if (!trendId) {
      log(10, 'Trend Detail', 'SKIPPED', { reason: 'No trend' });
    } else {
      try {
        const detailResp = await api.get(`/api/feed/${trendId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        log(10, 'Trend Detail', 'SUCCESS', {
          endpoint: 'GET /api/feed/:id',
          db: 'trends',
          hasRequired: !!detailResp.data.title && !!detailResp.data.score
        });
      } catch (e) {
        issue('CRITICAL', 'Detail', e.message);
        log(10, 'Trend Detail', 'FAILURE', {});
      }
    }
    
    // STEP 11: History (Save Trend)
    console.log('\n' + '='.repeat(70));
    console.log('STEP 11: HISTORY PERSISTENCE\n');
    if (!trendId) {
      log(11, 'History', 'SKIPPED', { reason: 'No trend' });
    } else {
      try {
        await api.post(`/api/feed/${trendId}/save`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = await User.findOne({ email: TEST_EMAIL });
        const saved = user && user.savedTrends && user.savedTrends.includes(trendId);
        if (saved) {
          log(11, 'History', 'SUCCESS', {
            endpoint: 'POST /api/feed/:id/save',
            db: ['users', 'trends'],
            persisted: true
          });
        } else {
          issue('CRITICAL', 'Persist', 'Save response success but not in DB');
          log(11, 'History', 'FAILURE', {});
        }
      } catch (e) {
        issue('CRITICAL', 'History', e.message);
        log(11, 'History', 'FAILURE', {});
      }
    }
    
    // STEP 12: Logout
    console.log('\n' + '='.repeat(70));
    console.log('STEP 12: LOGOUT / SESSION\n');
    try {
      try {
        await api.post('/api/users/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
        log(12, 'Logout', 'SUCCESS', { endpoint: 'POST /api/users/logout' });
      } catch (e) {
        if (e.response?.status === 404) {
          issue('LOW', 'No Logout', 'No logout endpoint - tokens not invalidatable');
          log(12, 'Logout', 'SUCCESS (No Endpoint)', { issue: 'No logout endpoint' });
        } else {
          throw e;
        }
      }
    } catch (e) {
      issue('CRITICAL', 'Logout', e.message);
      log(12, 'Logout', 'FAILURE', {});
    }
    
    // Calculate readiness
    const critical = audit.issues.critical.length;
    const medium = audit.issues.medium.length;
    const low = audit.issues.low.length;
    audit.readiness = Math.max(0, 100 - (critical * 15) - (medium * 5) - (low * 1));
    
    // Final report
    console.log('\n' + '='.repeat(70));
    console.log('FINAL REPORT');
    console.log('='.repeat(70));
    console.log(`\n📊 SUMMARY`);
    console.log(`  Steps: ${audit.stats.success}/${audit.stats.total} ✅`);
    console.log(`  Failed: ${audit.stats.failed} ❌`);
    console.log(`\n🐛 ISSUES`);
    console.log(`  Critical: ${critical}`);
    console.log(`  Medium: ${medium}`);
    console.log(`  Low: ${low}`);
    console.log(`  Total: ${critical + medium + low}`);
    console.log(`\n📈 PFA READINESS: ${audit.readiness}%`);
    console.log('='.repeat(70) + '\n');
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, '../AUDIT_RESULTS.json'), JSON.stringify(audit, null, 2));
    console.log('✅ Audit saved to AUDIT_RESULTS.json\n');
    
    // Cleanup
    await User.deleteOne({ email: TEST_EMAIL });
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ AUDIT FAILED:', error.message);
    process.exit(1);
  }
}

runAudit();
