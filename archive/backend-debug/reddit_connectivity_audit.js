const axios = require('axios');

async function run(label, config) {
  try {
    const res = await axios.get('https://www.reddit.com/r/artificial.json?limit=5', config);
    console.log('\n== ' + label + ' ==');
    console.log('status=', res.status);
    console.log('content-type=', res.headers && res.headers['content-type']);
    console.log('posts=', Array.isArray(res.data?.data?.children) ? res.data.data.children.length : 'N/A');
    console.log('final-url=', (res.request && res.request.res && res.request.res.responseUrl) || '');
  } catch (err) {
    console.log('\n== ' + label + ' ==');
    console.log('status=', err.response?.status || 0);
    console.log('statusText=', err.response?.statusText || err.message);
    console.log('content-type=', err.response?.headers?.['content-type'] || '');
    console.log('data-preview=', typeof err.response?.data === 'string' ? err.response.data.slice(0, 200) : JSON.stringify(err.response?.data || {}).slice(0, 200));
    console.log('final-url=', (err.response?.request && err.response.request.res && err.response.request.res.responseUrl) || '');
  }
}

(async () => {
  await run('no headers', { timeout: 30000, maxRedirects: 5, validateStatus: () => true });
  await run('User-Agent only', { headers: { 'User-Agent': 'trend-predictor/1.0 by /u/opensource' }, timeout: 30000, maxRedirects: 5, validateStatus: () => true });
  await run('same as redditService.js', {
    headers: {
      Authorization: 'bearer dummy-token',
      'User-Agent': 'trend-predictor/1.0 by /u/opensource',
      Accept: 'application/json'
    },
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: () => true
  });
})();
