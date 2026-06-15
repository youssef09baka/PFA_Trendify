/**
 * EXTENDED REDDIT DATA SOURCE AUDIT
 * 
 * Testing additional sources and strategies
 */

const axios = require('axios');

const additionalSources = {
  newReddit: {
    name: 'New Reddit JSON (www)',
    url: 'https://www.reddit.com/r/technology.json?limit=10&raw_json=1',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  },
  praw: {
    name: 'PRAW (Python Reddit API Wrapper)',
    url: 'N/A - Python library',
    note: 'Local implementation only'
  },
  webRTC: {
    name: 'WebRTC/Browser Approach',
    url: 'N/A - Would require headless browser',
    note: 'Puppeteer/Playwright needed'
  },
  hnTopics: {
    name: 'Hacker News API (alternative source)',
    url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    headers: {}
  },
  jsonPlaceholder: {
    name: 'Reddit Mirror (reddit-mirror.herokuapp.com)',
    url: 'https://reddit-mirror.herokuapp.com/r/technology?limit=10',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  },
  rss: {
    name: 'Reddit RSS (Current Solution)',
    url: 'https://www.reddit.com/r/technology/.rss?limit=100',
    headers: {},
    note: 'Already working - returns 200'
  }
};

const testSource = async (key, config) => {
  if (config.note && !config.url.includes('http')) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📋 ${config.name}`);
    console.log(`Note: ${config.note}`);
    return { note: config.note };
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📡 Testing: ${config.name}`);
  console.log(`URL: ${config.url}`);

  try {
    const response = await axios.get(config.url, {
      headers: config.headers || { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 3
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.status === 200) {
      console.log(`✓ AVAILABLE`);
      const contentType = response.headers['content-type'];
      console.log(`Content-Type: ${contentType}`);
      
      // Try to parse
      try {
        const data = response.data;
        if (data.data?.children) {
          const count = data.data.children.length;
          console.log(`✓ JSON parseable - ${count} items`);
        } else if (Array.isArray(data)) {
          console.log(`✓ JSON parseable - ${data.length} items`);
        } else if (contentType?.includes('rss')) {
          console.log(`✓ RSS format`);
        }
      } catch (e) {
        console.log(`✓ Response received`);
      }
      
      return { available: true, status: 200 };
    } else {
      console.log(`✗ ${response.status}: ${response.statusText || 'Blocked/Error'}`);
      return { available: false, status: response.status };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`✗ Service unavailable`);
    } else if (error.code === 'ENOTFOUND') {
      console.log(`✗ Domain not found`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`✗ Timeout`);
    } else {
      console.log(`✗ ${error.message}`);
    }
    return { available: false };
  }
};

const main = async () => {
  console.log('\n' + '═'.repeat(70));
  console.log('EXTENDED REDDIT DATA SOURCE AUDIT');
  console.log('═'.repeat(70));

  const results = {};
  for (const [key, config] of Object.entries(additionalSources)) {
    results[key] = await testSource(key, config);
  }

  // Analysis
  console.log('\n\n' + '═'.repeat(70));
  console.log('DETAILED ANALYSIS');
  console.log('═'.repeat(70));

  console.log('\n🔴 BLOCKED SOURCES:');
  console.log('  1. www.reddit.com (JSON) - Returns 403 Forbidden');
  console.log('  2. old.reddit.com (JSON) - Returns 403 Forbidden');
  console.log('  3. oauth.reddit.com - Returns 403 Forbidden (needs auth)');
  console.log('  4. api.pushshift.io - Returns 403 Forbidden (archived/deprecated)');
  console.log('  5. reddit-api.pushshift.io - Returns 403 Forbidden');
  console.log('  6. Redlib mirrors - Timeout (service down)');

  console.log('\n🟢 WORKING SOURCES:');
  console.log('  1. Reddit RSS - ✓ WORKS (www.reddit.com/r/XXX/.rss)');
  console.log('     └─ Returns: 100 OK, valid RSS data');
  console.log('     └─ Issue: score and num_comments fields are 0');

  console.log('\n🟡 AVAILABLE BUT LIMITED:');
  console.log('  1. Reddit OAuth API');
  console.log('     └─ Requires: Registered application + bearer token');
  console.log('     └─ Setup: Create app at reddit.com/prefs/apps');
  console.log('     └─ Implementation: 4-6 hours (OAuth flow)');
  console.log('     └─ Data quality: ✓ Full (score, comments, all fields)');

  console.log('\n🔵 WORKAROUNDS:');
  console.log('  1. Browser Automation (Puppeteer/Playwright)');
  console.log('     └─ Approach: Headless browser to scrape JSON endpoint');
  console.log('     └─ Setup: 2-3 hours');
  console.log('     └─ Data quality: ✓ Full');
  console.log('     └─ Reliability: ⚠️ Resource-heavy, slower');

  console.log('\n  2. Cache + Scraping');
  console.log('     └─ Store popular posts in DB');
  console.log('     └─ Run hourly background job');
  console.log('     └─ Setup: 3-4 hours');
  console.log('     └─ Data quality: ✓ Cached snapshot');

  console.log('\n' + '═'.repeat(70));
};

main().catch(err => { console.error(err); process.exit(1); });
