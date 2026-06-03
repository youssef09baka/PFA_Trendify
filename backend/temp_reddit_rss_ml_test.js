const fs = require('fs');
const path = require('path');
const { fetchRedditPosts } = require('./services/data/redditRss');
const { generateMlFeatures } = require('./services/featureGenerator');
const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000/predict';

const normalizeMlPrediction = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === '1' || normalized === 'high' || normalized.includes('high')) return 'HIGH';
  if (normalized === '0' || normalized === 'low' || normalized.includes('low')) return 'LOW';
  if (normalized === 'medium' || normalized.includes('medium')) return 'UNAVAILABLE';
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
    const resp = await axios.post(ML_URL, payload, { timeout: 8000 });
    return normalizeMlPrediction(resp.data?.prediction ?? 'UNAVAILABLE');
  } catch (err) {
    return `ERROR:${err.message}`;
  }
};

(async () => {
  const posts = await fetchRedditPosts('technology', 100);
  console.log(`Fetched ${posts.length} RSS posts from r/technology`);
  let gt0 = 0, eq0 = 0;
  posts.forEach((p) => {
    if (p.data.num_comments > 0) gt0 += 1;
    else eq0 += 1;
  });
  console.log('RSS num_comments counts:', { gt0, eq0 });
  console.log('Sample RSS posts:');
  posts.slice(0, 10).forEach((p, i) => console.log(`${i + 1}. score=${p.data.score} num_comments=${p.data.num_comments} title=${p.data.title}`));

  console.log('\nGenerating ML predictions for RSS posts...');
  const preds = [];
  for (const item of posts) {
    const raw = item.data;
    const trend = {
      title: raw.title,
      num_comments: raw.num_comments,
      post_length: raw.selftext ? raw.selftext.length : raw.title.length,
      hour: raw.created_utc ? new Date(raw.created_utc * 1000).getUTCHours() : new Date().getUTCHours(),
      title_length: raw.title.length,
      sentiment: 0,
      source: 'Reddit'
    };
    preds.push(await predict(trend));
  }
  const high = preds.filter((x) => x === 'HIGH').length;
  const low = preds.filter((x) => x === 'LOW').length;
  const other = preds.length - high - low;
  console.log('RSS ML counts:', { HIGH: high, LOW: low, OTHER: other });
  fs.writeFileSync(path.join(__dirname, 'temp_reddit_rss_ml_test_report.json'), JSON.stringify({ counts: { gt0, eq0 }, ml: { HIGH: high, LOW: low, OTHER: other }, sample: posts.slice(0, 10).map((p) => ({ score: p.data.score, num_comments: p.data.num_comments, title: p.data.title })) }, null, 2));
  console.log('Report written to backend/temp_reddit_rss_ml_test_report.json');
})();
