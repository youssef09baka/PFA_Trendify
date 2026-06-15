/**
 * Test Reddit RSS Endpoints with ML Predictions
 * 
 * Uses Reddit RSS feeds (not JSON API which is blocked)
 * Fetches 100 posts from r/technology and runs ML predictions
 */

const axios = require('axios');
const { fetchRedditPosts } = require('./services/data/redditRss');
const { generateMlFeatures } = require('./services/featureGenerator');

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001/predict';

const normalizeMlPrediction = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === '1' || normalized === 'high' || normalized.includes('high')) return 'HIGH';
  if (normalized === '0' || normalized === 'low' || normalized.includes('low')) return 'LOW';
  return 'UNAVAILABLE';
};

const predict = async (trend) => {
  const normalized = generateMlFeatures(trend);
  const payload = {
    num_comments: normalized.num_comments,
    post_length: normalized.post_length,
    hour: normalized.hour,
    title_length: normalized.title_length,
    sentiment: normalized.sentiment
  };
  try {
    const resp = await axios.post(ML_URL, payload, { timeout: 3000 });
    return normalizeMlPrediction(resp.data?.prediction ?? 'UNAVAILABLE');
  } catch (err) {
    return null;
  }
};

const run = async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('REDDIT PUBLIC JSON ENDPOINT TEST - Using RSS Feeds');
    console.log('='.repeat(70));

    console.log('\n📡 Fetching 100 posts from r/technology via RSS...');
    const posts = await fetchRedditPosts('technology', 100);
    
    if (!Array.isArray(posts) || posts.length === 0) {
      throw new Error('No posts fetched');
    }

    console.log(`✓ Fetched ${posts.length} posts\n`);

    // Show first 10 posts with title, score, num_comments
    console.log('TOP 10 POSTS:');
    console.log('-'.repeat(70));
    posts.slice(0, 10).forEach((p, i) => {
      const data = p.data || p;
      console.log(`${(i + 1).toString().padEnd(2)} | score: ${String(data.score).padEnd(5)} | comments: ${String(data.num_comments).padEnd(5)} | ${data.title.substring(0, 60)}`);
    });

    // Count num_comments statistics
    console.log('\n' + '-'.repeat(70));
    console.log('COMMENT COUNT STATISTICS:');
    console.log('-'.repeat(70));
    
    const stats = {
      gt0: 0,
      eq0: 0
    };

    posts.forEach((p) => {
      const data = p.data || p;
      const comments = Number(data.num_comments) || 0;
      if (comments > 0) stats.gt0 += 1;
      else stats.eq0 += 1;
    });

    console.log(`Posts with num_comments > 0:  ${stats.gt0} (${((stats.gt0 / posts.length) * 100).toFixed(1)}%)`);
    console.log(`Posts with num_comments = 0:  ${stats.eq0} (${((stats.eq0 / posts.length) * 100).toFixed(1)}%)`);

    // Run ML predictions
    console.log('\n' + '-'.repeat(70));
    console.log('RUNNING ML PREDICTIONS (100 posts)...');
    console.log('-'.repeat(70));
    
    const predictions = [];
    let successCount = 0;
    let serviceErrors = 0;

    for (let i = 0; i < posts.length; i += 1) {
      const data = posts[i].data || posts[i];
      const trend = {
        title: data.title || '',
        num_comments: Number(data.num_comments) || 0,
        post_length: (data.selftext || data.title || '').length,
        hour: data.created_utc ? new Date(data.created_utc * 1000).getUTCHours() : new Date().getUTCHours(),
        title_length: (data.title || '').length,
        sentiment: 0,
        source: 'Reddit'
      };

      const pred = await predict(trend);
      predictions.push(pred);
      
      if (pred !== null) {
        successCount += 1;
      } else {
        serviceErrors += 1;
      }

      // Progress indicator
      if ((i + 1) % 25 === 0) {
        process.stdout.write(`[${i + 1}/${posts.length}] `);
      }
    }
    
    if (serviceErrors > 0) {
      console.log(`\n⚠️  ML Service unavailable (${serviceErrors}/${posts.length} predictions failed)`);
      console.log('Note: ML service must be running on port 5001 to get predictions');
    } else {
      console.log(`\n✓ ML predictions completed`);
    }

    // Analyze results
    console.log('\n' + '-'.repeat(70));
    console.log('ML PREDICTION RESULTS:');
    console.log('-'.repeat(70));
    
    const validPredictions = predictions.filter(p => p !== null);
    const highCount = validPredictions.filter((x) => x === 'HIGH').length;
    const lowCount = validPredictions.filter((x) => x === 'LOW').length;
    const mlServiceUnavailable = predictions.filter(p => p === null).length;

    if (mlServiceUnavailable > 0) {
      console.log(`⚠️  ML SERVICE NOT AVAILABLE - ${mlServiceUnavailable} predictions skipped`);
      console.log(`\nTo enable ML predictions:`);
      console.log(`  1. Ensure Python is installed`);
      console.log(`  2. Install requirements: pip install -r requirements.txt`);
      console.log(`  3. Run: python ml-model/app.py`);
    } else {
      console.log(`HIGH:        ${highCount.toString().padEnd(4)} (${((highCount / validPredictions.length) * 100).toFixed(1)}%)`);
      console.log(`LOW:         ${lowCount.toString().padEnd(4)} (${((lowCount / validPredictions.length) * 100).toFixed(1)}%)`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Posts:      ${posts.length}`);
    console.log(`Comments > 0:     ${stats.gt0}`);
    console.log(`Comments = 0:     ${stats.eq0}`);
    
    if (mlServiceUnavailable === 0) {
      const validPreds = predictions.filter(p => p !== null);
      const hCount = validPreds.filter((x) => x === 'HIGH').length;
      const lCount = validPreds.filter((x) => x === 'LOW').length;
      console.log(`\nML HIGH:          ${hCount}`);
      console.log(`ML LOW:           ${lCount}`);
    }
    
    console.log(`\nRuntime Status:   ✅ RSS FEED SUCCESS`);
    if (mlServiceUnavailable > 0) {
      console.log(`ML Service:       ⚠️  UNAVAILABLE`);
    }
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message || err);
    process.exit(1);
  }
};

run();
