const test = require('node:test');
const assert = require('node:assert/strict');

const axios = require('axios');
const { computeRetryDelay, shouldRetry } = require('../services/data/redditOAuth');

test('computeRetryDelay returns a positive delay for 429 responses', () => {
  const delay = computeRetryDelay(429, 1);
  assert.ok(delay >= 1000);
  assert.ok(delay <= 8000);
});

test('shouldRetry returns false for permanent 403 responses', () => {
  assert.equal(shouldRetry(403, 1), false);
});

test('shouldRetry returns true for transient 429 responses before max attempts', () => {
  assert.equal(shouldRetry(429, 1), true);
  assert.equal(shouldRetry(429, 4), false);
});

test('fetchRedditPosts returns OAuth-fetched posts for a subreddit', async () => {
  const originalPost = axios.post;
  const originalGet = axios.get;
  process.env.REDDIT_CLIENT_ID = 'client-id';
  process.env.REDDIT_CLIENT_SECRET = 'client-secret';
  process.env.REDDIT_USER_AGENT = 'trend-predictor-test';

  let postCalls = 0;
  let getCalls = 0;

  axios.post = async () => {
    postCalls += 1;
    return {
      status: 200,
      data: { access_token: 'oauth-token', expires_in: 3600, scope: 'read' }
    };
  };

  axios.get = async (url, config) => {
    getCalls += 1;
    assert.equal(url, 'https://oauth.reddit.com/r/AI/hot.json');
    assert.equal(config.headers.Authorization, 'bearer oauth-token');
    return {
      status: 200,
      data: {
        data: {
          children: [{ data: { title: 'AI update', score: 10, num_comments: 5, subreddit: 'AI' } }]
        }
      }
    };
  };

  delete require.cache[require.resolve('../services/data/redditOAuth')];
  const { fetchRedditPosts } = require('../services/data/redditOAuth');

  const posts = await fetchRedditPosts('AI', 10);

  assert.equal(posts.length, 1);
  assert.equal(postCalls, 1);
  assert.equal(getCalls, 1);

  axios.post = originalPost;
  axios.get = originalGet;
  delete require.cache[require.resolve('../services/data/redditOAuth')];
});

test('getRedditTrends preserves Reddit trend extraction with the OAuth transport', async () => {
  const originalModule = require.cache[require.resolve('../services/data/redditOAuth')];
  require.cache[require.resolve('../services/data/redditOAuth')] = {
    id: require.resolve('../services/data/redditOAuth'),
    filename: require.resolve('../services/data/redditOAuth'),
    loaded: true,
    exports: {
      fetchRedditPosts: async () => [
        {
          kind: 't3',
          data: {
            title: 'AI breakthroughs are accelerating across the industry',
            score: 120,
            num_comments: 18,
            created_utc: Math.floor(Date.now() / 1000),
            selftext: 'This is a high-signal Reddit post for testing.',
            subreddit: 'AI',
            permalink: '/r/AI/comments/abc/test-post',
            url: 'https://example.com/post',
            thumbnail: 'https://example.com/thumb.jpg',
            is_self: false,
            media: null,
            link_flair_text: 'news'
          }
        }
      ]
    }
  };

  delete require.cache[require.resolve('../services/data/redditService')];
  const { getRedditTrends } = require('../services/data/redditService');

  const trends = await getRedditTrends();

  assert.ok(Array.isArray(trends));
  assert.ok(trends.length > 0);
  assert.equal(trends[0].source, 'Reddit');
  assert.equal(trends[0].source_detail, 'AI');

  if (originalModule) {
    require.cache[require.resolve('../services/data/redditOAuth')] = originalModule;
  } else {
    delete require.cache[require.resolve('../services/data/redditOAuth')];
  }
  delete require.cache[require.resolve('../services/data/redditService')];
});

test('getAccessToken acquires and caches an OAuth token', async () => {
  const originalPost = axios.post;
  process.env.REDDIT_CLIENT_ID = 'client-id';
  process.env.REDDIT_CLIENT_SECRET = 'client-secret';
  process.env.REDDIT_USER_AGENT = 'trend-predictor-test';

  let calls = 0;
  axios.post = async (url, data, config) => {
    calls += 1;
    assert.equal(url, 'https://www.reddit.com/api/v1/access_token');
    assert.equal(config.headers.Authorization, 'Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=');
    return {
      status: 200,
      data: {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'read'
      }
    };
  };

  delete require.cache[require.resolve('../services/data/redditOAuth')];
  const { getAccessToken } = require('../services/data/redditOAuth');

  const firstToken = await getAccessToken();
  const secondToken = await getAccessToken();

  assert.equal(firstToken, 'test-token');
  assert.equal(secondToken, 'test-token');
  assert.equal(calls, 1);

  axios.post = originalPost;
  delete require.cache[require.resolve('../services/data/redditOAuth')];
});
