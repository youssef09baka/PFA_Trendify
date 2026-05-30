const axios = require('axios');

(async () => {
  const res = await axios.get('https://www.reddit.com/r/artificial.json?limit=5', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: () => true
  });
  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || '');
  const matches = [
    'captcha', 'cloudflare', 'access denied', 'forbidden', 'verify you are human',
    'browser', 'challenge', 'rate limit', 'too many requests', 'request blocked'
  ].filter((k) => text.toLowerCase().includes(k));
  console.log('STATUS', res.status);
  console.log('MATCHES', matches);
  console.log('BODY_SNIPPET', text.slice(0, 1200));
})();
