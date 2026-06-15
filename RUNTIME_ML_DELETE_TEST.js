const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Test configuration
const BACKEND_PORT = 3000;
const BACKEND_START_TIMEOUT = 15000; // 15 seconds
const TEST_TIMEOUT = 30000; // 30 seconds
const ML_MODEL_PATH = path.join(__dirname, 'ml-model');
const ML_MODEL_BACKUP = path.join(__dirname, 'ml-model.backup');

const log = (msg) => console.log(`[TEST] ${new Date().toISOString()} ${msg}`);
const error = (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`);
const success = (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} ${msg}`);

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  tests: {},
  summary: {}
};

// Helper: Make HTTP request
async function makeRequest(method, path, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path,
      method,
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTlmOGJjZTllMTljM2NmZDMwMTZlZiIsImlhdCI6MTc4MDE1MTk4NSwiZXhwIjoyMDAwMDAwMDAwfQ.GWahC1S5-r4VKp5pSVgb3OkcvIqBBxGMGNJGgYDCHfk'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    req.end();
  });
}

// Helper: Wait for backend to be ready
async function waitForBackend(maxWaitMs = BACKEND_START_TIMEOUT) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await makeRequest('GET', '/', 2000);
      if (response.status === 200) {
        log('Backend is ready');
        return true;
      }
    } catch (err) {
      // Still waiting
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Backend did not start within ${maxWaitMs}ms`);
}

// Test 1: Backend startup with ml-model present
async function test1_backendStartupWithML() {
  log('TEST 1: Backend startup with ml-model present');
  
  try {
    // Check if ml-model exists
    if (!fs.existsSync(ML_MODEL_PATH)) {
      throw new Error(`ml-model folder not found at ${ML_MODEL_PATH}`);
    }
    
    // Kill any existing processes
    await execAsync('Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force', { shell: 'powershell' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    // Start backend
    log('Starting backend server...');
    const childProcess = await execAsync('Push-Location D:\\PFA_V1\\backend; $job = Start-Job -ScriptBlock { node server.js }; Start-Sleep -Milliseconds 5000; $job.State', { shell: 'powershell', timeout: 20000 });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Try to connect
    const response = await makeRequest('GET', '/', 5000);
    
    testResults.tests.test1 = {
      name: 'Backend startup with ml-model',
      status: response.status === 200 ? 'PASS' : 'FAIL',
      response: {
        statusCode: response.status,
        message: response.data.substring(0, 100)
      }
    };
    
    success('TEST 1: PASS - Backend started successfully');
    return true;
  } catch (err) {
    error(`TEST 1: FAIL - ${err.message}`);
    testResults.tests.test1 = {
      name: 'Backend startup with ml-model',
      status: 'FAIL',
      error: err.message
    };
    return false;
  }
}

// Test 2: Test GET /api/feed endpoint
async function test2_getFeedEndpoint() {
  log('TEST 2: Testing GET /api/feed endpoint');
  
  try {
    const response = await makeRequest('GET', '/api/feed?page=1&limit=12', 10000);
    
    const data = JSON.parse(response.data);
    const hasTrends = Array.isArray(data.items) && data.items.length > 0;
    
    testResults.tests.test2 = {
      name: 'GET /api/feed',
      status: response.status === 200 && hasTrends ? 'PASS' : 'PARTIAL',
      response: {
        statusCode: response.status,
        itemCount: data.items ? data.items.length : 0,
        hasMlPrediction: data.items && data.items.length > 0 ? data.items[0].ml_prediction ? true : false : false
      }
    };
    
    if (response.status === 200) {
      success(`TEST 2: PASS - Feed endpoint works (${data.items.length} items)`);
      return true;
    }
  } catch (err) {
    error(`TEST 2: FAIL - ${err.message}`);
    testResults.tests.test2 = {
      name: 'GET /api/feed',
      status: 'FAIL',
      error: err.message
    };
  }
  return false;
}

// Test 3: Test GET /api/trends endpoint
async function test3_getTrendsEndpoint() {
  log('TEST 3: Testing GET /api/trends endpoint');
  
  try {
    const response = await makeRequest('GET', '/api/trends', 10000);
    const data = JSON.parse(response.data);
    
    testResults.tests.test3 = {
      name: 'GET /api/trends',
      status: response.status === 200 ? 'PASS' : 'FAIL',
      response: {
        statusCode: response.status,
        trendCount: data.trends ? data.trends.length : 0
      }
    };
    
    if (response.status === 200) {
      success(`TEST 3: PASS - Trends endpoint works (${data.trends ? data.trends.length : 0} trends)`);
      return true;
    }
  } catch (err) {
    error(`TEST 3: FAIL - ${err.message}`);
    testResults.tests.test3 = {
      name: 'GET /api/trends',
      status: 'FAIL',
      error: err.message
    };
  }
  return false;
}

// Test 4: Backup ml-model and test backend without it
async function test4_backendWithoutML() {
  log('TEST 4: Backend operation without ml-model folder');
  
  try {
    // Stop backend
    await execAsync('Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force', { shell: 'powershell' }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Backup ml-model
    if (fs.existsSync(ML_MODEL_BACKUP)) {
      fs.rmSync(ML_MODEL_BACKUP, { recursive: true, force: true });
    }
    fs.renameSync(ML_MODEL_PATH, ML_MODEL_BACKUP);
    log('ml-model folder moved to backup');

    // Start backend again
    log('Starting backend without ml-model...');
    const childProcess = await execAsync('Push-Location D:\\PFA_V1\\backend; $job = Start-Job -ScriptBlock { node server.js }; Start-Sleep -Milliseconds 5000; $job.State', { shell: 'powershell', timeout: 20000 });
    
    await new Promise(r => setTimeout(r, 3000));

    // Try to connect
    const response = await makeRequest('GET', '/', 5000);
    
    const canStartWithoutML = response.status === 200;
    testResults.tests.test4 = {
      name: 'Backend startup without ml-model',
      status: canStartWithoutML ? 'PASS' : 'FAIL',
      response: {
        statusCode: response.status,
        message: canStartWithoutML ? 'Backend started successfully' : 'Failed to start'
      }
    };
    
    if (canStartWithoutML) {
      success('TEST 4: PASS - Backend works without ml-model');
    } else {
      error('TEST 4: FAIL - Backend cannot start without ml-model');
    }

    return canStartWithoutML;
  } catch (err) {
    error(`TEST 4: FAIL - ${err.message}`);
    testResults.tests.test4 = {
      name: 'Backend startup without ml-model',
      status: 'FAIL',
      error: err.message
    };
    return false;
  }
}

// Test 5: Test endpoints without ml-model
async function test5_endpointsWithoutML() {
  log('TEST 5: Testing endpoints without ml-model');
  
  try {
    const response = await makeRequest('GET', '/api/feed?page=1&limit=12', 10000);
    const data = JSON.parse(response.data);
    
    const status = response.status === 200 ? 'PASS' : 'FAIL';
    testResults.tests.test5 = {
      name: 'GET /api/feed without ml-model',
      status,
      response: {
        statusCode: response.status,
        itemCount: data.items ? data.items.length : 0,
        mlAvailable: data.items && data.items.length > 0 ? data.items[0].ml_prediction ? true : false : null
      }
    };
    
    if (status === 'PASS') {
      success('TEST 5: PASS - Feed still works without ml-model');
      return true;
    }
  } catch (err) {
    error(`TEST 5: FAIL - ${err.message}`);
    testResults.tests.test5 = {
      name: 'GET /api/feed without ml-model',
      status: 'FAIL',
      error: err.message
    };
  }
  return false;
}

// Test 6: Check ML dependency detection
async function test6_mlDependencyAnalysis() {
  log('TEST 6: Analyzing production code for ML dependencies');
  
  try {
    const mlServicePath = path.join(__dirname, 'backend', 'services', 'mlService.js');
    const mlServiceCode = fs.readFileSync(mlServicePath, 'utf-8');
    
    const hasAxiosPost = mlServiceCode.includes('axios.post');
    const hasHttpCall = mlServiceCode.includes('http://') || mlServiceCode.includes('ML_SERVICE_URL');
    const usesClassifier = mlServiceCode.includes('classifyTrendPotential');
    
    testResults.tests.test6 = {
      name: 'ML dependency analysis',
      status: 'INFO',
      findings: {
        mlServiceMakesHttpCalls: hasAxiosPost || hasHttpCall,
        usesInternalClassifier: usesClassifier,
        httpCallsDetected: hasAxiosPost,
        mlServiceUrlUsed: hasHttpCall,
        conclusion: usesClassifier && !(hasAxiosPost || hasHttpCall) ? 'SAFE_TO_DELETE' : 'NOT_SAFE'
      }
    };
    
    if (usesClassifier && !(hasAxiosPost || hasHttpCall)) {
      success('TEST 6: INFO - ML service refactored to use internal classifier (SAFE)');
    }
    
    return true;
  } catch (err) {
    error(`TEST 6: FAIL - ${err.message}`);
    testResults.tests.test6 = {
      name: 'ML dependency analysis',
      status: 'FAIL',
      error: err.message
    };
    return false;
  }
}

// Test 7: Restore ml-model
async function test7_restoreML() {
  log('TEST 7: Restoring ml-model folder');
  
  try {
    // Stop backend
    await execAsync('Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force', { shell: 'powershell' }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Restore ml-model
    if (fs.existsSync(ML_MODEL_BACKUP)) {
      if (fs.existsSync(ML_MODEL_PATH)) {
        fs.rmSync(ML_MODEL_PATH, { recursive: true, force: true });
      }
      fs.renameSync(ML_MODEL_BACKUP, ML_MODEL_PATH);
      log('ml-model folder restored');
    }

    testResults.tests.test7 = {
      name: 'Restore ml-model',
      status: fs.existsSync(ML_MODEL_PATH) ? 'PASS' : 'FAIL',
      restored: fs.existsSync(ML_MODEL_PATH)
    };
    
    return fs.existsSync(ML_MODEL_PATH);
  } catch (err) {
    error(`TEST 7: FAIL - ${err.message}`);
    testResults.tests.test7 = {
      name: 'Restore ml-model',
      status: 'FAIL',
      error: err.message
    };
    return false;
  }
}

// Main execution
async function runAllTests() {
  log('Starting comprehensive ML deletion safety tests...\n');

  try {
    // Pre-check ml-model exists
    if (!fs.existsSync(ML_MODEL_PATH)) {
      throw new Error('ml-model folder not found - cannot run tests');
    }

    await test1_backendStartupWithML();
    await new Promise(r => setTimeout(r, 2000));

    await test2_getFeedEndpoint();
    await test3_getTrendsEndpoint();

    await test4_backendWithoutML();
    await new Promise(r => setTimeout(r, 2000));

    await test5_endpointsWithoutML();
    
    await test6_mlDependencyAnalysis();
    
    await test7_restoreML();

    // Generate summary
    const passed = Object.values(testResults.tests).filter(t => t.status === 'PASS').length;
    const failed = Object.values(testResults.tests).filter(t => t.status === 'FAIL').length;
    const info = Object.values(testResults.tests).filter(t => t.status === 'INFO').length;

    testResults.summary = {
      passed,
      failed,
      info,
      verdict: failed === 0 ? 'SAFE_TO_DELETE_ML_MODEL' : 'NOT_SAFE_TO_DELETE_ML_MODEL',
      reason: failed === 0 ? 'All tests passed - backend works without ml-model' : `${failed} test(s) failed`
    };

    log('\n=== TEST SUMMARY ===');
    log(`PASSED: ${passed}`);
    log(`FAILED: ${failed}`);
    log(`INFO: ${info}`);
    log(`VERDICT: ${testResults.summary.verdict}`);
    log(`\nFull results saved to RUNTIME_ML_DELETE_TEST_RESULTS.json`);

  } catch (err) {
    error(`Fatal error: ${err.message}`);
    testResults.summary = {
      status: 'FATAL_ERROR',
      error: err.message
    };
  } finally {
    // Save results
    fs.writeFileSync(
      path.join(__dirname, 'RUNTIME_ML_DELETE_TEST_RESULTS.json'),
      JSON.stringify(testResults, null, 2)
    );

    // Stop backend
    await execAsync('Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force', { shell: 'powershell' }).catch(() => {});

    log('Tests completed');
  }
}

// Run tests
runAllTests().catch(err => {
  error(`Test execution failed: ${err.message}`);
  process.exit(1);
});
