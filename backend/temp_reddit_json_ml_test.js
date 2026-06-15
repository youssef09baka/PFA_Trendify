const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { fetchRedditPosts: fetchRedditPostsFromRss } = require('./services/data/redditRss');
const { generateMlFeatures } = require('./services/featureGenerator');

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

const describePost = (post) => ({ score: post.score, num_comments: post.num_comments, title: post.title });

const run = async () => {
  console.log('Fetching public JSON from Reddit...');
  const url = 'https://www.reddit.com/r/technology.json?limit=100&raw_json=1';
  const jsonResp = await axios.get(url, { 
    timeout: 30000, 
    validateStatus: () => true, 
    maxRedirects: 5,
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });
  if (jsonResp.status !== 200) {
    console.log('Response Status:', jsonResp.status);
    console.log('Response Headers:', JSON.stringify(jsonResp.headers, null, 2));
    console.log('Response Body (first 500 chars):', String(jsonResp.data).substring(0, 500));
    throw new Error(`Reddit JSON fetch failed: ${jsonResp.status}`);
  }
  const items = Array.isArray(jsonResp.data?.data?.children) ? jsonResp.data.data.children : [];
  if (items.length === 0) throw new Error('No Reddit JSON items found');

  const posts = items.map((child) => {
    const data = child?.data || {};
    return {
      score: Number(data.score) || 0,
      num_comments: Number(data.num_comments) || 0,
      title: String(data.title || '').trim(),
      created_utc: Number(data.created_utc) || null,
      selftext: String(data.selftext || '').trim(),
      subreddit: String(data.subreddit || '').trim(),
      permalink: String(data.permalink || '').trim(),
      url: String(data.url_overridden_by_dest || data.url || '').trim()
    };
  });

  console.log(`Fetched ${posts.length} public JSON posts`);
  const jsonCounts = { gt0: 0, eq0: 0 };
  posts.forEach((p) => {
    if (p.num_comments > 0) jsonCounts.gt0 += 1;
    else jsonCounts.eq0 += 1;
  });

  console.log('Public JSON num_comments counts:', jsonCounts);
  console.log('Public JSON first 10 posts:');
  posts.slice(0, 10).forEach((p, i) => console.log(`${i + 1}. score=${p.score} num_comments=${p.num_comments} title=${p.title}`));

  console.log('\nFetching current RSS results...');
  const rssPosts = await fetchRedditPostsFromRss('technology', 100);
  console.log(`Fetched ${rssPosts.length} RSS posts`);
  const rssCounts = { gt0: 0, eq0: 0 };
  rssPosts.forEach((p) => {
    if (p.data.num_comments > 0) rssCounts.gt0 += 1;
    else rssCounts.eq0 += 1;
  });
  console.log('RSS num_comments counts:', rssCounts);
  console.log('RSS first 10 posts:');
  rssPosts.slice(0, 10).forEach((p, i) => console.log(`${i + 1}. score=${p.data.score} num_comments=${p.data.num_comments} title=${p.data.title}`));

  console.log('\nGenerating ML predictions for public JSON posts...');
  const jsonPreds = [];
  for (let i = 0; i < posts.length; i += 1) {
    const trend = {
      title: posts[i].title,
      num_comments: posts[i].num_comments,
      post_length: posts[i].selftext ? posts[i].selftext.length : posts[i].title.length,
      hour: posts[i].created_utc ? new Date(posts[i].created_utc * 1000).getUTCHours() : new Date().getUTCHours(),
      title_length: posts[i].title.length,
      sentiment: 0,
      source: 'Reddit'
    };
    const pred = await predict(trend);
    jsonPreds.push(pred);
  }
  const jsonHigh = jsonPreds.filter((x) => x === 'HIGH').length;
  const jsonLow = jsonPreds.filter((x) => x === 'LOW').length;
  const jsonOther = jsonPreds.length - jsonHigh - jsonLow;
  console.log('Public JSON ML counts:', { HIGH: jsonHigh, LOW: jsonLow, OTHER: jsonOther });

  console.log('\nGenerating ML predictions for RSS posts...');
  const rssPreds = [];
  for (let i = 0; i < rssPosts.length; i += 1) {
    const raw = rssPosts[i].data;
    const trend = {
      title: raw.title,
      num_comments: raw.num_comments,
      post_length: raw.selftext ? raw.selftext.length : raw.title.length,
      hour: raw.created_utc ? new Date(raw.created_utc * 1000).getUTCHours() : new Date().getUTCHours(),
      title_length: raw.title.length,
      sentiment: 0,
      source: 'Reddit'
    };
    const pred = await predict(trend);
    rssPreds.push(pred);
  }
  const rssHigh = rssPreds.filter((x) => x === 'HIGH').length;
  const rssLow = rssPreds.filter((x) => x === 'LOW').length;
  const rssOther = rssPreds.length - rssHigh - rssLow;
  console.log('RSS ML counts:', { HIGH: rssHigh, LOW: rssLow, OTHER: rssOther });

  const report = {
    publicJson: { counts: jsonCounts, ml: { HIGH: jsonHigh, LOW: jsonLow, OTHER: jsonOther }, sample: posts.slice(0, 10) },
    rss: { counts: rssCounts, ml: { HIGH: rssHigh, LOW: rssLow, OTHER: rssOther }, sample: rssPosts.slice(0, 10).map((p) => ({ score: p.data.score, num_comments: p.data.num_comments, title: p.data.title })) }
  };
  fs.writeFileSync(path.join(__dirname, 'temp_reddit_json_ml_test_report.json'), JSON.stringify(report, null, 2));
  console.log('\nReport written to backend/temp_reddit_json_ml_test_report.json');
};

run().catch((err) => { console.error(err.stack || err); process.exit(1); });

