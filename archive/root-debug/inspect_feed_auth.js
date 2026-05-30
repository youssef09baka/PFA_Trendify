const http = require('http');
const https = require('https');
const { URL } = require('url');
const API_ROOT = 'http://localhost:3000/api';

function requestJson(url, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      method,
      headers
    };

    const req = transport.request(parsedUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (err) { parsed = data; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const email = `test+${Date.now()}@example.com`;
    const password = 'password123';

    const signup = await requestJson(`${API_ROOT}/users/signup`, 'POST', {
      'Content-Type': 'application/json'
    }, JSON.stringify({ name: 'Test User', email, password }));
    console.log('signup status', signup.status);

    const login = await requestJson(`${API_ROOT}/users/login`, 'POST', {
      'Content-Type': 'application/json'
    }, JSON.stringify({ email, password }));
    console.log('login status', login.status);
    if (!login.data || !login.data.token) {
      console.error('login failed', login.data);
      return;
    }

    const token = login.data.token;
    const feed = await requestJson(`${API_ROOT}/feed?page=1&limit=24`, 'GET', {
      Authorization: `Bearer ${token}`
    });
    console.log('feed status', feed.status);
    if (feed.data && Array.isArray(feed.data.items)) {
      console.log('feed count', feed.data.items.length);
      console.log('meta', feed.data.meta);
      feed.data.items.slice(0, 12).forEach((item, i) => {
        console.log(`item ${i + 1}:`, {
          title: item.title,
          source: item.source,
          category: item.category,
          score: item.score,
          media: Boolean(item.image || item.video || item.thumbnail)
        });
      });
    } else {
      console.log('feed data', feed.data);
    }
  } catch (e) {
    console.error('error', e);
  }
})();