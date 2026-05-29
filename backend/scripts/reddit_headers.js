const axios = require('axios');

(async () => {
  const res = await axios.get('https://www.reddit.com/r/artificial.json?limit=5', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: () => true
  });
  console.log('STATUS', res.status);
  console.log('HEADERS', res.headers);
})();
