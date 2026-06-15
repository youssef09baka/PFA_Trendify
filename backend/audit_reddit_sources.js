/**
 * REDDIT DATA SOURCE AUDIT
 * 
 * Evaluates 5 alternative Reddit data sources
 * Tests availability, data completeness, and implementation effort
 */

const axios = require('axios');

const sources = {
  oldReddit: {
    name: 'Old Reddit JSON',
    url: 'https://old.reddit.com/r/technology.json?limit=10',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  },
  oauth: {
    name: 'Reddit OAuth API',
    url: 'https://oauth.reddit.com/r/technology?limit=10',
    note: 'Requires registered app and bearer token'
  },
  pushshift: {
    name: 'Pushshift API',
    url: 'https://api.pushshift.io/reddit/submission/search?subreddit=technology&sort=desc&size=10',
    headers: {}
  },
  redlib: {
    name: 'Redlib Mirror (libreddit)',
    url: 'https://redlib.io/r/technology.json?limit=10',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  },
  pushshiftV3: {
    name: 'Pushshift V3 (API Recovery)',
    url: 'https://reddit-api.pushshift.io/reddit/submission/search?subreddit=technology&sort=desc&size=10',
    headers: {}
  }
};

const testSource = async (key, config) => {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📡 Testing: ${config.name}`);
  console.log(`URL: ${config.url}`);
  console.log(`${'─'.repeat(70)}`);

  try {
    const response = await axios.get(config.url, {
      headers: config.headers || { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 5
    });

    console.log(`Status: ${response.status}`);

    if (response.status === 200) {
      const data = response.data;
      
      // Determine data structure
      let hasScore = false;
      let hasNumComments = false;
      let hasPosts = 0;
      let postCount = 0;

      if (data.data?.children) {
        // Standard Reddit JSON format
        hasPosts = data.data.children;
        postCount = hasPosts.length;
        if (hasPosts.length > 0) {
          const firstPost = hasPosts[0].data;
          hasScore = 'score' in firstPost && firstPost.score !== undefined;
          hasNumComments = 'num_comments' in firstPost && firstPost.num_comments !== undefined;
          
          console.log(`✓ Posts returned: ${postCount}`);
          console.log(`✓ First post title: ${firstPost.title.substring(0, 60)}...`);
          console.log(`✓ Score available: ${hasScore ? '✓ YES' : '✗ NO'} (value: ${firstPost.score})`);
          console.log(`✓ Num_comments available: ${hasNumComments ? '✓ YES' : '✗ NO'} (value: ${firstPost.num_comments})`);
          console.log(`✓ Created_utc available: ${'created_utc' in firstPost ? '✓ YES' : '✗ NO'}`);
          console.log(`✓ Subreddit available: ${'subreddit' in firstPost ? '✓ YES' : '✗ NO'}`);
        }
      } else if (Array.isArray(data)) {
        // Pushshift format (array of objects)
        postCount = data.length;
        if (postCount > 0) {
          const firstPost = data[0];
          hasScore = 'score' in firstPost;
          hasNumComments = 'num_comments' in firstPost;
          
          console.log(`✓ Posts returned: ${postCount}`);
          console.log(`✓ First post title: ${(firstPost.title || 'N/A').substring(0, 60)}...`);
          console.log(`✓ Score available: ${hasScore ? '✓ YES' : '✗ NO'} (value: ${firstPost.score})`);
          console.log(`✓ Num_comments available: ${hasNumComments ? '✓ YES' : '✗ NO'} (value: ${firstPost.num_comments})`);
          console.log(`✓ Created_utc available: ${'created_utc' in firstPost ? '✓ YES' : '✗ NO'}`);
          console.log(`✓ Subreddit available: ${'subreddit' in firstPost ? '✓ YES' : '✗ NO'}`);
        }
      } else {
        console.log(`⚠️  Unexpected response format`);
        console.log(`Data keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
      }

      return {
        available: true,
        status: 200,
        postCount,
        hasScore,
        hasNumComments,
        fullResponse: data
      };
    } else if (response.status === 403) {
      console.log(`✗ BLOCKED: 403 Forbidden`);
      return { available: false, status: 403, reason: 'Blocked by server' };
    } else if (response.status === 404) {
      console.log(`✗ NOT FOUND: 404`);
      return { available: false, status: 404, reason: 'Endpoint not found' };
    } else {
      console.log(`✗ ERROR: ${response.status} ${response.statusText}`);
      return { available: false, status: response.status };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`✗ UNAVAILABLE: Connection refused`);
      return { available: false, reason: 'Service unavailable' };
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      console.log(`✗ TIMEOUT: Could not reach endpoint`);
      return { available: false, reason: 'Timeout / DNS lookup failed' };
    }
    console.log(`✗ ERROR: ${error.message}`);
    return { available: false, reason: error.message };
  }
};

const main = async () => {
  console.log('\n' + '═'.repeat(70));
  console.log('REDDIT DATA SOURCE AUDIT - 5 ALTERNATIVE SOURCES');
  console.log('═'.repeat(70));
  console.log('\nEvaluating:\n');
  Object.entries(sources).forEach(([ key, cfg ]) => {
    console.log(`  ${key}: ${cfg.name}`);
  });

  const results = {};
  for (const [key, config] of Object.entries(sources)) {
    results[key] = await testSource(key, config);
  }

  // Summary Report
  console.log('\n\n' + '═'.repeat(70));
  console.log('SUMMARY REPORT');
  console.log('═'.repeat(70));

  const summary = [
    ['Source', 'Status', 'Score', 'Comments', 'Posts', 'Viable'],
    ['─'.repeat(20), '─'.repeat(15), '─'.repeat(8), '─'.repeat(10), '─'.repeat(8), '─'.repeat(8)]
  ];

  Object.entries(results).forEach(([key, result]) => {
    const status = result.available ? '✓ Available' : '✗ Not Available';
    const score = result.hasScore ? '✓ YES' : result.available ? '✗ NO' : '─';
    const comments = result.hasNumComments ? '✓ YES' : result.available ? '✗ NO' : '─';
    const posts = result.postCount ? `${result.postCount}` : '─';
    const viable = (result.hasScore && result.hasNumComments) ? '✓ YES' : (result.available && result.postCount > 0) ? '⚠ PARTIAL' : '✗ NO';
    
    summary.push([
      key,
      status,
      score,
      comments,
      posts,
      viable
    ]);
  });

  summary.forEach(row => {
    console.log(row.map((cell, i) => cell.padEnd([22, 16, 10, 12, 10, 10][i])).join(''));
  });

  console.log('\n' + '═'.repeat(70));
};

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
