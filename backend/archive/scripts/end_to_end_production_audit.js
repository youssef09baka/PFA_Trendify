/**
 * END-TO-END PRODUCTION AUDIT SCRIPT (IMPROVED)
 * 
 * Comprehensive testing of complete user journey with enhanced error handling
 */

const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Trend = require('../models/Trend');
const connectDB = require('../config/db');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_USER_EMAIL = `audit_test_${Date.now()}@example.com`;
const TEST_USER_PASSWORD = 'AuditTest123!@#';

// Create axios instance with retries
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Audit results
const auditResults = {
  timestamp: new Date().toISOString(),
  steps: [],
  issues: {
    critical: [],
    medium: [],
    low: []
  },
  stats: {
    totalSteps: 12,
    successSteps: 0,
    failureSteps: 0
  },
  deploymentBlockers: [],
  gradeImpactingWeaknesses: [],
  readinessPercentage: 0
};

function logStep(stepNumber, stepName, status, details = {}) {
  const step = { stepNumber, stepName, status, timestamp: new Date().toISOString(), details };
  auditResults.steps.push(step);
  
  if (status === 'SUCCESS') auditResults.stats.successSteps++;
  else if (status === 'FAILURE') auditResults.stats.failureSteps++;
  
  console.log(`\n[STEP ${stepNumber}] ${stepName}: ${status}`);
}

function logIssue(severity, title, description, impact = '') {
  const issue = { title, description, impact, affectedStep: auditResults.steps.length, timestamp: new Date().toISOString() };
  auditResults.issues[severity.toLowerCase()].push(issue);
  console.log(`  ⚠️ [${severity.toUpperCase()}] ${title}: ${description}`);
}

// Wait for backend to be ready
async function waitForBackend(maxRetries = 30) {
  console.log('Waiting for backend to be ready...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await api.get('/api/trends', { timeout: 2000 });
      console.log('✅ Backend is ready');
      return true;
    } catch (e) {
      if (i < maxRetries - 1) {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  console.error('\n❌ Backend did not respond within timeout');
  return false;
}

// STEP 1: Register
async function step1_Register() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 1: REGISTER');
    
    const payload = { name: 'Audit Test User', email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD };
    const response = await api.post('/api/users/signup', payload);
    
    const result = {
      endpoint: 'POST /api/users/signup',
      requestPayload: payload,
      responseStatus: response.status,
      responsePayload: { success: !!response.data.user, userId: response.data.user?._id },
      databaseCollections: ['users'],
      issues: []
    };
    
    const user = await User.findOne({ email: TEST_USER_EMAIL });
    if (!user) {
      result.issues.push('User not persisted in database');
      logIssue('CRITICAL', 'User Registration DB Sync', 'User returned in response but not persisted in database');
      logStep(1, 'Register User', 'FAILURE', result);
      return null;
    }
    
    logStep(1, 'Register User', 'SUCCESS', result);
    return user;
  } catch (error) {
    logIssue('CRITICAL', 'Registration Failed', error.response?.data?.error || error.message);
    logStep(1, 'Register User', 'FAILURE', { error: error.message, status: error.response?.status });
    return null;
  }
}

// STEP 2: Login
async function step2_Login() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 2: LOGIN');
    
    const payload = { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD };
    const response = await api.post('/api/users/login', payload);
    
    const result = {
      endpoint: 'POST /api/users/login',
      responseStatus: response.status,
      tokenExists: !!response.data.token,
      databaseCollections: ['users']
    };
    
    if (!response.data.token) {
      logIssue('CRITICAL', 'JWT Generation', 'Login endpoint did not return authentication token');
      logStep(2, 'Login', 'FAILURE', result);
      return null;
    }
    
    logStep(2, 'Login', 'SUCCESS', result);
    return response.data.token;
  } catch (error) {
    logIssue('CRITICAL', 'Login Failed', error.response?.data?.error || error.message);
    logStep(2, 'Login', 'FAILURE', { error: error.message });
    return null;
  }
}

// STEP 3: Verify JWT Generation
async function step3_VerifyJWT(token) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 3: VERIFY JWT GENERATION');
    console.log('='.repeat(70));
    
    if (!token) {
      logIssue('CRITICAL', 'JWT Missing', 'No token provided for verification');
      logStep(3, 'Verify JWT Generation', 'FAILURE', { token: null });
      return false;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      logIssue('CRITICAL', 'JWT Malformed', 'Token does not have 3 parts (header.payload.signature)');
      logStep(3, 'Verify JWT Generation', 'FAILURE', { tokenParts: parts.length });
      return false;
    }
    
    // Decode payload (without verification, just checking structure)
    let payload;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (e) {
      logIssue('CRITICAL', 'JWT Payload Invalid', 'Cannot decode JWT payload');
      logStep(3, 'Verify JWT Generation', 'FAILURE', { error: e.message });
      return false;
    }
    
    const result = {
      endpoint: 'Internal JWT Verification',
      tokenStructure: {
        hasHeader: true,
        hasPayload: true,
        hasSignature: true,
        tokenLength: token.length
      },
      payloadContent: {
        userId: payload.userId,
        email: payload.email,
        iat: new Date(payload.iat * 1000).toISOString(),
        exp: new Date(payload.exp * 1000).toISOString(),
        expiresIn: Math.round((payload.exp - payload.iat) / 3600) + ' hours'
      },
      issues: []
    };
    
    if (!payload.userId && !payload.id) {
      result.issues.push('JWT missing user identification claim');
      logIssue('MEDIUM', 'JWT Missing User ID', 'JWT payload does not contain userId or id claim');
    }
    
    if (!payload.exp) {
      result.issues.push('JWT missing expiration claim');
      logIssue('CRITICAL', 'JWT Missing Expiration', 'JWT token has no expiration, potential security risk');
    } else {
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn < 3600) {
        result.issues.push(`JWT expires very soon (${expiresIn}s)`);
        logIssue('MEDIUM', 'Short Token Lifetime', `JWT expires in ${expiresIn}s, consider longer expiration`);
      }
    }
    
    logStep(3, 'Verify JWT Generation', 'SUCCESS', result);
    return true;
  } catch (error) {
    logIssue('CRITICAL', 'JWT Verification Error', error.message);
    logStep(3, 'Verify JWT Generation', 'FAILURE', { error: error.message });
    return false;
  }
}

// STEP 4: Test Protected Routes
async function step4_ProtectedRoutes(token) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 4: PROTECTED ROUTES');
    console.log('='.repeat(70));
    
    const result = {
      endpoint: 'GET /api/users/profile',
      requestHeaders: {
        Authorization: `Bearer ${token.substring(0, 20)}...`
      },
      responseStatus: null,
      databaseCollections: ['users'],
      issues: []
    };
    
    const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    result.responseStatus = response.status;
    result.responsePayload = {
      user: {
        id: response.data._id,
        email: response.data.email,
        name: response.data.name,
        preferences: response.data.preferences,
        aiRemaining: response.data.aiRemaining
      }
    };
    
    // Test without token (should fail)
    try {
      await axios.get(`${API_BASE_URL}/api/users/profile`);
      result.issues.push('Protected route accessible without token');
      logIssue('CRITICAL', 'Auth Bypass', 'Protected route accessible without authentication token');
    } catch (e) {
      if (e.response?.status === 401) {
        result.authProtectionStatus = 'WORKING';
      }
    }
    
    logStep(4, 'Protected Routes', 'SUCCESS', result);
    return true;
  } catch (error) {
    logIssue('CRITICAL', 'Protected Route Access Failed', error.message);
    logStep(4, 'Protected Routes', 'FAILURE', { error: error.message });
    return false;
  }
}

// STEP 5: User Preferences
async function step5_UserPreferences(token) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 5: USER PREFERENCES');
    console.log('='.repeat(70));
    
    const requestPayload = {
      preferences: ['technology', 'business', 'health']
    };
    
    const response = await axios.put(`${API_BASE_URL}/api/users/preferences`, requestPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const result = {
      endpoint: 'PUT /api/users/preferences',
      requestPayload,
      responseStatus: response.status,
      responsePayload: response.data,
      databaseCollections: ['users'],
      issues: []
    };
    
    // Verify update in database
    const user = await User.findOne({ email: TEST_USER_EMAIL });
    if (!user || !user.preferences || user.preferences.length !== 3) {
      result.issues.push('Preferences not persisted in database');
      logIssue('CRITICAL', 'Preference Persistence', 'Preferences returned in response but not saved to database');
    }
    
    logStep(5, 'User Preferences', 'SUCCESS', result);
    return true;
  } catch (error) {
    logIssue('CRITICAL', 'Preference Update Failed', error.message);
    logStep(5, 'User Preferences', 'FAILURE', { error: error.message });
    return false;
  }
}

// STEP 6: Feed Loading
async function step6_FeedLoading(token) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 6: FEED LOADING');
    console.log('='.repeat(70));
    
    const result = {
      endpoint: 'GET /api/feed',
      responseStatus: null,
      databaseCollections: ['trends', 'users'],
      issues: [],
      trendCount: 0,
      highClassificationCount: 0,
      lowClassificationCount: 0,
      unavailableCount: 0,
      nullClassificationCount: 0
    };
    
    const response = await axios.get(`${API_BASE_URL}/api/feed`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    result.responseStatus = response.status;
    const trends = response.data.trends || response.data;
    result.trendCount = Array.isArray(trends) ? trends.length : 0;
    
    if (result.trendCount === 0) {
      logIssue('MEDIUM', 'Empty Feed', 'Feed returned no trends');
    }
    
    // Analyze classification distribution
    if (Array.isArray(trends)) {
      trends.forEach(trend => {
        const classification = trend.ml_prediction;
        if (classification === 'HIGH') result.highClassificationCount++;
        else if (classification === 'LOW') result.lowClassificationCount++;
        else if (classification === 'UNAVAILABLE') result.unavailableCount++;
        else result.nullClassificationCount++;
      });
      
      result.classificationAnalysis = {
        HIGH: `${result.highClassificationCount} (${((result.highClassificationCount / result.trendCount) * 100).toFixed(1)}%)`,
        LOW: `${result.lowClassificationCount} (${((result.lowClassificationCount / result.trendCount) * 100).toFixed(1)}%)`,
        UNAVAILABLE: `${result.unavailableCount} (${((result.unavailableCount / result.trendCount) * 100).toFixed(1)}%)`,
        OTHER: `${result.nullClassificationCount} (${((result.nullClassificationCount / result.trendCount) * 100).toFixed(1)}%)`
      };
    }
    
    if (result.nullClassificationCount > 0) {
      logIssue('MEDIUM', 'Invalid Classifications Found', `${result.nullClassificationCount} trends with non-standard ml_prediction values`);
    }
    
    logStep(6, 'Feed Loading', 'SUCCESS', result);
    return trends;
  } catch (error) {
    logIssue('CRITICAL', 'Feed Loading Failed', error.message);
    logStep(6, 'Feed Loading', 'FAILURE', { error: error.message });
    return [];
  }
}

// STEP 7: Trend Retrieval
async function step7_TrendRetrieval(token) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 7: TREND RETRIEVAL');
    console.log('='.repeat(70));
    
    const result = {
      endpoint: 'GET /api/trends',
      responseStatus: null,
      databaseCollections: ['trends'],
      issues: [],
      trendCount: 0
    };
    
    const response = await axios.get(`${API_BASE_URL}/api/trends`);
    
    result.responseStatus = response.status;
    const trends = response.data.trends || response.data;
    result.trendCount = Array.isArray(trends) ? trends.length : 0;
    
    result.sampleTrend = Array.isArray(trends) && trends.length > 0 ? {
      id: trends[0]._id,
      title: trends[0].title,
      source: trends[0].source,
      score: trends[0].score,
      ml_prediction: trends[0].ml_prediction,
      popularity: trends[0].popularity,
      growth: trends[0].growth
    } : null;
    
    if (result.trendCount === 0) {
      logIssue('CRITICAL', 'No Trends Available', 'Trends endpoint returned empty result');
    }
    
    logStep(7, 'Trend Retrieval', 'SUCCESS', result);
    return trends;
  } catch (error) {
    logIssue('CRITICAL', 'Trend Retrieval Failed', error.message);
    logStep(7, 'Trend Retrieval', 'FAILURE', { error: error.message });
    return [];
  }
}

// STEP 8: AI Analysis Generation
async function step8_AIAnalysis(token, trendId) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 8: AI ANALYSIS GENERATION');
    console.log('='.repeat(70));
    
    if (!trendId) {
      logIssue('MEDIUM', 'No Trend ID', 'No trend ID available for AI analysis');
      logStep(8, 'AI Analysis Generation', 'FAILURE', { error: 'No trend ID' });
      return null;
    }
    
    const result = {
      endpoint: 'POST /api/feed/:id/analyze',
      requestPayload: { trendId },
      responseStatus: null,
      databaseCollections: ['trends', 'users'],
      issues: [],
      analysisReceived: false,
      ideaReceived: false
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/feed/${trendId}/analyze`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    result.responseStatus = response.status;
    result.analysisReceived = !!response.data.analysis;
    result.ideaReceived = !!response.data.idea;
    
    result.responsePayload = {
      hasAnalysis: result.analysisReceived,
      analysisLength: response.data.analysis?.length || 0,
      hasIdea: result.ideaReceived,
      ideaLength: response.data.idea?.length || 0
    };
    
    if (!result.analysisReceived) {
      result.issues.push('No analysis returned');
      logIssue('MEDIUM', 'Missing Analysis', 'AI analysis endpoint did not return analysis content');
    }
    
    if (!result.ideaReceived) {
      result.issues.push('No idea returned');
      logIssue('MEDIUM', 'Missing Idea', 'AI analysis endpoint did not return idea content');
    }
    
    // Check quota
    const user = await User.findOne({ email: TEST_USER_EMAIL });
    if (user && user.aiRemaining < 0) {
      result.issues.push('AI quota went negative');
      logIssue('CRITICAL', 'Quota Handling', 'AI quota went below zero, quota enforcement failing');
    }
    
    logStep(8, 'AI Analysis Generation', 'SUCCESS', result);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 || error.response?.data?.error?.includes('quota')) {
      logIssue('MEDIUM', 'Quota Limit Hit', 'AI analysis quota exceeded - this may be expected');
    } else {
      logIssue('CRITICAL', 'AI Analysis Failed', error.response?.data?.error || error.message);
    }
    logStep(8, 'AI Analysis Generation', error.response?.status === 429 ? 'SUCCESS (Quota)' : 'FAILURE', { 
      error: error.response?.data?.error || error.message 
    });
    return null;
  }
}

// STEP 9: HIGH/LOW Classification Audit
async function step9_ClassificationAudit() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 9: HIGH/LOW CLASSIFICATION AUDIT');
    console.log('='.repeat(70));
    
    const result = {
      endpoint: 'Internal Database Query',
      databaseCollections: ['trends'],
      issues: [],
      classificationStats: {},
      scoreDistribution: {},
      anomalies: []
    };
    
    // Get all trends
    const trends = await Trend.find({});
    result.totalTrends = trends.length;
    
    // Classification distribution
    const classifications = {};
    const scoreRanges = {
      'under_30': 0,
      '30_50': 0,
      '50_70': 0,
      '70_100': 0,
      'above_100': 0
    };
    
    trends.forEach(trend => {
      const classification = trend.ml_prediction || 'UNKNOWN';
      classifications[classification] = (classifications[classification] || 0) + 1;
      
      const score = trend.score || 0;
      if (score < 30) scoreRanges.under_30++;
      else if (score < 50) scoreRanges['30_50']++;
      else if (score < 70) scoreRanges['50_70']++;
      else if (score < 100) scoreRanges['70_100']++;
      else scoreRanges.above_100++;
      
      // Check for high score but low classification (or vice versa)
      if (score >= 70 && classification === 'LOW') {
        result.anomalies.push({
          type: 'HIGH_SCORE_LOW_CLASS',
          trend: trend.title,
          score: score,
          classification: classification
        });
      }
      if (score < 70 && classification === 'HIGH') {
        result.anomalies.push({
          type: 'LOW_SCORE_HIGH_CLASS',
          trend: trend.title,
          score: score,
          classification: classification
        });
      }
    });
    
    result.classificationStats = classifications;
    result.scoreDistribution = scoreRanges;
    
    // Calculate percentages
    const total = result.totalTrends;
    Object.keys(classifications).forEach(key => {
      result.classificationStats[key] = {
        count: classifications[key],
        percentage: ((classifications[key] / total) * 100).toFixed(1) + '%'
      };
    });
    
    if (result.anomalies.length > 0) {
      logIssue('MEDIUM', 'Classification Anomalies', `${result.anomalies.length} trends with misaligned score/classification`);
      result.issues.push(`${result.anomalies.length} score/classification anomalies detected`);
    }
    
    // Check for UNKNOWN classifications (should be rare/zero after migration)
    if (classifications['UNKNOWN'] && classifications['UNKNOWN'] > trends.length * 0.01) {
      logIssue('MEDIUM', 'High UNKNOWN Classification Rate', `${classifications['UNKNOWN']} trends (${((classifications['UNKNOWN']/total)*100).toFixed(1)}%) still classified as UNKNOWN`);
    }
    
    logStep(9, 'HIGH/LOW Classification Audit', 'SUCCESS', result);
    return result;
  } catch (error) {
    logIssue('CRITICAL', 'Classification Audit Failed', error.message);
    logStep(9, 'HIGH/LOW Classification Audit', 'FAILURE', { error: error.message });
    return null;
  }
}

// STEP 10: Trend Detail Page
async function step10_TrendDetail(token, trendId) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 10: TREND DETAIL PAGE');
    console.log('='.repeat(70));
    
    if (!trendId) {
      logIssue('MEDIUM', 'No Trend ID', 'No trend ID available for detail view');
      logStep(10, 'Trend Detail Page', 'FAILURE', { error: 'No trend ID' });
      return null;
    }
    
    const result = {
      endpoint: 'GET /api/feed/:id',
      responseStatus: null,
      databaseCollections: ['trends'],
      issues: [],
      fieldsReturned: []
    };
    
    const response = await axios.get(`${API_BASE_URL}/api/feed/${trendId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    result.responseStatus = response.status;
    result.fieldsReturned = Object.keys(response.data);
    
    result.responsePayload = {
      title: response.data.title,
      source: response.data.source,
      score: response.data.score,
      ml_prediction: response.data.ml_prediction,
      analysis: response.data.analysis ? 'Present' : 'Missing',
      idea: response.data.idea ? 'Present' : 'Missing',
      popularity: response.data.popularity,
      growth: response.data.growth,
      media: {
        image: !!response.data.image,
        video: !!response.data.video,
        mediaType: response.data.mediaType
      }
    };
    
    if (!response.data.title || !response.data.score) {
      result.issues.push('Missing required fields');
      logIssue('MEDIUM', 'Incomplete Trend Data', 'Trend detail missing required fields');
    }
    
    logStep(10, 'Trend Detail Page', 'SUCCESS', result);
    return response.data;
  } catch (error) {
    logIssue('CRITICAL', 'Trend Detail Access Failed', error.message);
    logStep(10, 'Trend Detail Page', 'FAILURE', { error: error.message });
    return null;
  }
}

// STEP 11: History Persistence
async function step11_HistoryPersistence(token, trendId) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 11: HISTORY PERSISTENCE (Save Trend)');
    console.log('='.repeat(70));
    
    if (!trendId) {
      logIssue('MEDIUM', 'No Trend ID', 'No trend ID available for saving');
      logStep(11, 'History Persistence', 'FAILURE', { error: 'No trend ID' });
      return null;
    }
    
    const result = {
      endpoint: 'POST /api/feed/:id/save',
      responseStatus: null,
      databaseCollections: ['users', 'trends'],
      issues: [],
      savedSuccessfully: false
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/feed/${trendId}/save`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    result.responseStatus = response.status;
    result.responsePayload = response.data;
    
    // Verify save in database
    const user = await User.findOne({ email: TEST_USER_EMAIL });
    if (user && user.savedTrends && user.savedTrends.includes(trendId)) {
      result.savedSuccessfully = true;
    } else {
      result.issues.push('Trend save returned success but not persisted in database');
      logIssue('CRITICAL', 'Save Persistence Failed', 'Trend save response returned success but not found in user savedTrends');
    }
    
    // Test unsave
    const unsaveResponse = await axios.delete(`${API_BASE_URL}/api/feed/${trendId}/save`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    result.unsaveStatus = unsaveResponse.status;
    result.unsaveSuccessful = unsaveResponse.status === 200;
    
    logStep(11, 'History Persistence', 'SUCCESS', result);
    return result;
  } catch (error) {
    logIssue('CRITICAL', 'History Persistence Failed', error.message);
    logStep(11, 'History Persistence', 'FAILURE', { error: error.message });
    return null;
  }
}

// STEP 12: Logout / Session Validation
async function step12_LogoutSessionValidation(token) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('STEP 12: LOGOUT / SESSION VALIDATION');
    console.log('='.repeat(70));
    
    const result = {
      endpoint: 'POST /api/users/logout (or token validation)',
      issues: [],
      tokenValidationAfterLogout: 'Not tested (no logout endpoint)'
    };
    
    // Check if there's a logout endpoint
    try {
      const logoutResponse = await axios.post(`${API_BASE_URL}/api/users/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      result.endpoint = 'POST /api/users/logout';
      result.responseStatus = logoutResponse.status;
      result.logoutImplemented = true;
    } catch (e) {
      if (e.response?.status === 404) {
        result.logoutImplemented = false;
        result.issues.push('No logout endpoint found');
        logIssue('LOW', 'No Logout Endpoint', 'Application does not have a logout endpoint - token remains valid indefinitely');
      } else {
        throw e;
      }
    }
    
    // Try to access protected route with token (should still work - can't invalidate server-side without logout endpoint)
    try {
      const profileResponse = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!result.logoutImplemented) {
        result.issues.push('Token still valid after "logout" (no server-side invalidation)');
        logIssue('MEDIUM', 'No Server-Side Token Invalidation', 'JWT tokens cannot be invalidated server-side without logout endpoint');
      }
      result.tokenStillValid = true;
    } catch (e) {
      result.tokenStillValid = false;
      result.serverInvalidatedToken = true;
    }
    
    logStep(12, 'Logout / Session Validation', 'SUCCESS', result);
    return result;
  } catch (error) {
    logIssue('CRITICAL', 'Session Validation Failed', error.message);
    logStep(12, 'Logout / Session Validation', 'FAILURE', { error: error.message });
    return null;
  }
}

// Analyze and categorize bugs
function analyzeBugs() {
  console.log('\n' + '='.repeat(70));
  console.log('BUG ANALYSIS');
  console.log('='.repeat(70));
  
  // Deployment blockers
  const blockers = auditResults.issues.critical.filter(issue => {
    return issue.title.includes('Security') || 
           issue.title.includes('Auth') ||
           issue.title.includes('Persistence') ||
           issue.title.includes('Failed') ||
           issue.title.includes('Critical');
  });
  
  auditResults.deploymentBlockers = blockers.map(b => ({
    title: b.title,
    description: b.description,
    affectedStep: b.affectedStep,
    mustFixBefore: 'Production Deployment'
  }));
  
  // Grade-impacting weaknesses
  const gradeWeaknesses = [
    ...auditResults.issues.medium.filter(i => i.title.includes('Classification') || i.title.includes('Quota')),
    ...auditResults.issues.critical.filter(i => i.title.includes('Password') || i.title.includes('Token'))
  ];
  
  auditResults.gradeImpactingWeaknesses = gradeWeaknesses.map(w => ({
    weakness: w.title,
    impact: 'PFA Grade Impact',
    recommendation: 'Address before final presentation'
  }));
  
  // Calculate readiness percentage
  const criticalCount = auditResults.issues.critical.length;
  const mediumCount = auditResults.issues.medium.length;
  const lowCount = auditResults.issues.low.length;
  
  let readiness = 100;
  readiness -= (criticalCount * 15); // Each critical = -15%
  readiness -= (mediumCount * 5);     // Each medium = -5%
  readiness -= (lowCount * 1);        // Each low = -1%
  
  auditResults.readinessPercentage = Math.max(0, Math.min(100, readiness));
  
  // Add deployment blockers summary
  if (auditResults.deploymentBlockers.length > 0) {
    console.log('\n🚨 DEPLOYMENT BLOCKERS:');
    auditResults.deploymentBlockers.forEach((blocker, idx) => {
      console.log(`  ${idx + 1}. ${blocker.title}: ${blocker.description}`);
    });
  }
}

// Generate final report
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('END-TO-END AUDIT FINAL REPORT');
  console.log('='.repeat(70));
  
  console.log(`\n📊 EXECUTION SUMMARY`);
  console.log(`  Total Steps: ${auditResults.stats.totalSteps}`);
  console.log(`  Successful: ${auditResults.stats.successSteps} ✅`);
  console.log(`  Failed: ${auditResults.stats.failureSteps} ❌`);
  
  console.log(`\n🐛 ISSUE SUMMARY`);
  console.log(`  Critical: ${auditResults.issues.critical.length}`);
  console.log(`  Medium: ${auditResults.issues.medium.length}`);
  console.log(`  Low: ${auditResults.issues.low.length}`);
  console.log(`  Total: ${auditResults.issues.critical.length + auditResults.issues.medium.length + auditResults.issues.low.length}`);
  
  if (auditResults.deploymentBlockers.length > 0) {
    console.log(`\n🚨 DEPLOYMENT BLOCKERS: ${auditResults.deploymentBlockers.length}`);
    auditResults.deploymentBlockers.forEach((blocker, idx) => {
      console.log(`  ${idx + 1}. ${blocker.title}`);
    });
  }
  
  console.log(`\n📈 PFA READINESS ASSESSMENT`);
  console.log(`  Readiness Score: ${auditResults.readinessPercentage}%`);
  
  if (auditResults.readinessPercentage >= 85) {
    console.log(`  Grade Level: EXCELLENT - Ready for presentation`);
  } else if (auditResults.readinessPercentage >= 70) {
    console.log(`  Grade Level: GOOD - Minor issues to address`);
  } else if (auditResults.readinessPercentage >= 50) {
    console.log(`  Grade Level: FAIR - Significant issues to address`);
  } else {
    console.log(`  Grade Level: POOR - Major issues blocking presentation`);
  }
  
  return auditResults;
}

// Main execution
async function runAudit() {
  try {
    console.log('\n' + '█'.repeat(70));
    console.log('█ END-TO-END PRODUCTION AUDIT - COMPLETE USER JOURNEY');
    console.log('█ ' + new Date().toISOString());
    console.log('█'.repeat(70));
    
    await connectDB();
    console.log('\n✅ Connected to MongoDB');
    
    // Clean up any previous test user
    await User.deleteOne({ email: TEST_USER_EMAIL });
    console.log('✅ Cleaned up previous test data');
    
    // Execute all steps
    let user = await step1_Register();
    if (!user) throw new Error('Registration failed');
    
    let token = await step2_Login(user);
    if (!token) throw new Error('Login failed');
    
    await step3_VerifyJWT(token);
    
    await step4_ProtectedRoutes(token);
    
    await step5_UserPreferences(token);
    
    let trends = await step6_FeedLoading(token);
    
    let allTrends = await step7_TrendRetrieval(token);
    
    let trendId = allTrends && allTrends.length > 0 ? allTrends[0]._id : null;
    
    if (trendId) {
      await step8_AIAnalysis(token, trendId);
    }
    
    await step9_ClassificationAudit();
    
    if (trendId) {
      await step10_TrendDetail(token, trendId);
      await step11_HistoryPersistence(token, trendId);
    }
    
    await step12_LogoutSessionValidation(token);
    
    // Analyze and report
    analyzeBugs();
    const finalResults = generateReport();
    
    // Clean up test user
    await User.deleteOne({ email: TEST_USER_EMAIL });
    
    // Write results to file
    const fs = require('fs');
    fs.writeFileSync(
      path.join(__dirname, '../audit_results.json'),
      JSON.stringify(finalResults, null, 2)
    );
    
    console.log('\n✅ Audit results saved to backend/audit_results.json');
    console.log('\n' + '█'.repeat(70));
    console.log('█ AUDIT COMPLETE');
    console.log('█'.repeat(70) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ AUDIT FAILED:', error.message);
    process.exit(1);
  }
}

// Run the audit
runAudit();
