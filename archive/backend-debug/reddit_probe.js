const axios = require('axios');

const subs = ['AI','OpenAI','MachineLearning','technology','tech','programming','worldnews'];

(async () => {
  const results = [];
  for (const sub of subs) {
    const url = `https://www.reddit.com/r/${sub}.json?limit=40`;
    try {
      const res = await axios.get(url, { timeout: 15000, maxRedirects: 0 });
      results.push({
        subreddit: sub,
        endpoint: url,
        status: res.status,
        hasData: Array.isArray(res.data?.data?.children),
        count: res.data?.data?.children?.length || 0,
        headers: {
          'content-type': res.headers['content-type'] || null,
          server: res.headers.server || null,
          'x-ratelimit-remaining': res.headers['x-ratelimit-remaining'] || null
        }
      });
    } catch (err) {
      results.push({
        subreddit: sub,
        endpoint: url,
        status: err.response?.status || 0,
        statusText: err.response?.statusText || err.message,
        bodyPreview: typeof err.response?.data === 'string'
          ? String(err.response.data).slice(0, 300)
          : err.response?.data,
        headers: err.response?.headers || {},
        code: err.code || null
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
})();
