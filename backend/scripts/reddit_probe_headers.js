const axios = require('axios');

const urls = [
  'https://www.reddit.com/r/AI.json?limit=20',
  'https://www.reddit.com/r/AI.json?limit=20&raw_json=1',
  'https://api.reddit.com/r/AI/hot.json?limit=20'
];

const headers = {
  'User-Agent': 'TrendAI/1.0 (+https://trendai.local)',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9'
};

(async () => {
  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 20000, headers, maxRedirects: 0 });
      console.log('\nURL', url);
      console.log('STATUS', res.status);
      console.log('CONTENT_TYPE', res.headers['content-type']);
      console.log('DATA_OK', Boolean(res.data?.data?.children));
      console.log('COUNT', res.data?.data?.children?.length || 0);
    } catch (err) {
      console.log('\nURL', url);
      console.log('STATUS', err.response?.status || 0);
      console.log('STATUS_TEXT', err.response?.statusText || err.message);
      console.log('CONTENT_TYPE', err.response?.headers?.['content-type'] || null);
      console.log('BODY_SNIPPET', typeof err.response?.data === 'string' ? String(err.response.data).slice(0, 220) : err.response?.data);
      console.log('HEADERS', err.response?.headers || {});
    }
  }
})();
