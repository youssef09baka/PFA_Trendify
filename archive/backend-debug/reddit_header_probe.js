const axios = require('axios');

const browserUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function run(label, headers) {
  try {
    const res = await axios.get('https://www.reddit.com/r/artificial.json?limit=5', {
      headers,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true,
      httpsAgent: undefined
    });
    console.log('\n== ' + label + ' ==');
    console.log('status=', res.status);
    console.log('content-type=', res.headers['content-type']);
    console.log('posts=', Array.isArray(res.data?.data?.children) ? res.data.data.children.length : 'N/A');
  } catch (err) {
    console.log('\n== ' + label + ' ==');
    console.log('status=', err.response?.status || 0);
    console.log('statusText=', err.response?.statusText || err.message);
    console.log('content-type=', err.response?.headers?.['content-type'] || '');
    console.log('body=', typeof err.response?.data === 'string' ? err.response.data.slice(0, 220) : JSON.stringify(err.response?.data || {}).slice(0, 220));
  }
}

(async () => {
  await run('browser-ua', {
    'User-Agent': browserUA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.reddit.com/'
  });
  await run('browser-ua+cookie', {
    'User-Agent': browserUA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.reddit.com/',
    Cookie: 'reddit_session=; loid=; loidcreated=; _recentlyVisited=; over18=1'
  });
})();
