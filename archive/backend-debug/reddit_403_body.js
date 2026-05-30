const axios = require('axios');

(async () => {
  try {
    const res = await axios.get('https://www.reddit.com/r/artificial.json?limit=5', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true
    });
    console.log('STATUS', res.status);
    console.log('CTYPE', res.headers['content-type']);
    console.log('BODY', typeof res.data === 'string' ? res.data.slice(0, 2000) : JSON.stringify(res.data).slice(0, 2000));
  } catch (err) {
    console.log('ERR STATUS', err.response?.status || 0);
    console.log('ERR CT', err.response?.headers?.['content-type'] || '');
    console.log('ERR BODY', typeof err.response?.data === 'string' ? err.response.data.slice(0, 4000) : JSON.stringify(err.response?.data || {}).slice(0, 4000));
  }
})();
