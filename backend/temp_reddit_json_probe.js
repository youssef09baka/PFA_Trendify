const axios = require('axios');

const tests = [
  'https://www.reddit.com/r/technology.json?limit=100&raw_json=1',
  'https://api.reddit.com/r/technology.json?limit=100&raw_json=1'
];

(async () => {
  for (const url of tests) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://www.reddit.com/'
        },
        timeout: 30000,
        validateStatus: () => true
      });
      console.log('URL:', url, 'STATUS', res.status, 'CONTENT_TYPE', res.headers['content-type']);
      if (res.status === 200) {
        console.log('ITEMS', res.data?.data?.children?.length);
      } else {
        console.log('DATA SNIPPET', JSON.stringify(res.data).slice(0, 500));
      }
    } catch (err) {
      console.log('URL:', url, 'ERROR', err.message);
    }
  }
})();
