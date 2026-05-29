const axios = require('axios');

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'trend-predictor/1.0 by /u/opensource';
const REDDIT_OAUTH_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_OAUTH_API_BASE = 'https://oauth.reddit.com';
const REDDIT_FETCH_LIMIT = Number(process.env.REDDIT_FETCH_LIMIT || 75);
const REDDIT_MAX_RETRIES = Number(process.env.REDDIT_MAX_RETRIES || 3);
const REDDIT_RETRY_BASE_MS = Number(process.env.REDDIT_RETRY_BASE_MS || 1000);

let tokenCache = {
  token: null,
  expiresAt: 0,
  scope: null,
  pending: null
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const computeRetryDelay = (statusCode, attempt) => {
  const baseDelay = REDDIT_RETRY_BASE_MS * 2 ** (attempt - 1);
  const jitter = statusCode === 429 ? 500 : 0;
  return Math.min(baseDelay + jitter, 8000);
};

const shouldRetry = (statusCode, attempt) => {
  if (attempt >= REDDIT_MAX_RETRIES) return false;

  if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
    return statusCode !== 403;
  }

  return [500, 502, 503, 504].includes(statusCode);
};

const invalidateToken = () => {
  tokenCache = {
    token: null,
    expiresAt: 0,
    scope: null,
    pending: null
  };
};

const getAccessToken = async () => {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    const error = new Error('Missing Reddit OAuth credentials: REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are required');
    error.statusCode = 500;
    throw error;
  }

  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  if (tokenCache.pending) {
    return tokenCache.pending;
  }

  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');

  tokenCache.pending = (async () => {
    try {
      console.info('[Reddit OAuth] acquiring access token');
      const response = await axios.post(
        REDDIT_OAUTH_TOKEN_URL,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': REDDIT_USER_AGENT
          },
          timeout: 20000,
          validateStatus: () => true
        }
      );

      if (response.status >= 400) {
        const message = response.data?.error || response.statusText || 'Reddit token request failed';
        const error = new Error(message);
        error.statusCode = response.status;
        throw error;
      }

      const { access_token, expires_in, scope } = response.data || {};
      if (!access_token) {
        throw new Error('Reddit token response did not include an access_token');
      }

      tokenCache = {
        token: access_token,
        expiresAt: Date.now() + Number(expires_in || 3600) * 1000,
        scope: scope || null,
        pending: null
      };

      console.info(`[Reddit OAuth] token acquired; expiresAt=${new Date(tokenCache.expiresAt).toISOString()}; scope=${tokenCache.scope || 'n/a'}`);
      return tokenCache.token;
    } catch (error) {
      invalidateToken();
      console.error('[Reddit OAuth] token acquisition failed:', error.message);
      throw error;
    } finally {
      tokenCache.pending = null;
    }
  })();

  return tokenCache.pending;
};

const fetchRedditPosts = async (subreddit, limit = REDDIT_FETCH_LIMIT) => {
  const requestedLimit = Math.max(10, Number(limit || REDDIT_FETCH_LIMIT));
  let lastError = null;

  for (let attempt = 1; attempt <= REDDIT_MAX_RETRIES; attempt += 1) {
    try {
      const token = await getAccessToken();
      console.info(`[Reddit OAuth] requesting r/${subreddit} (attempt ${attempt}, limit=${requestedLimit})`);

      const response = await axios.get(`${REDDIT_OAUTH_API_BASE}/r/${encodeURIComponent(subreddit)}/hot.json`, {
        params: { limit: requestedLimit },
        headers: {
          Authorization: `bearer ${token}`,
          'User-Agent': REDDIT_USER_AGENT,
          Accept: 'application/json'
        },
        timeout: 30000,
        validateStatus: () => true
      });

      const statusCode = response.status;
      const children = Array.isArray(response.data?.data?.children) ? response.data.data.children : [];
      console.info(`[Reddit OAuth] r/${subreddit} responded with status=${statusCode}, posts=${children.length}`);

      if (statusCode >= 200 && statusCode < 300) {
        return children;
      }

      if (statusCode === 401) {
        invalidateToken();
        if (attempt < REDDIT_MAX_RETRIES) {
          console.warn(`[Reddit OAuth] 401 for r/${subreddit}; retrying after token refresh`);
          continue;
        }
      }

      if (shouldRetry(statusCode, attempt)) {
        const delayMs = computeRetryDelay(statusCode, attempt);
        console.warn(`[Reddit OAuth] retrying r/${subreddit} after status=${statusCode} in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }

      const error = new Error(response.data?.message || `Reddit API request failed with status ${statusCode}`);
      error.statusCode = statusCode;
      error.response = response;
      throw error;
    } catch (error) {
      lastError = error;
      if (shouldRetry(error.statusCode || error.response?.status, attempt)) {
        const delayMs = computeRetryDelay(error.statusCode || error.response?.status || 500, attempt);
        console.warn(`[Reddit OAuth] transient failure for r/${subreddit}: ${error.message}; retrying in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }
      break;
    }
  }

  console.error(`[Reddit OAuth] failed for r/${subreddit}: ${lastError?.message || 'unknown error'}`);

  const error = new Error(lastError?.message || `Reddit OAuth request failed for r/${subreddit}`);
  error.statusCode = lastError?.statusCode || lastError?.response?.status || 502;
  throw error;
};

module.exports = {
  computeRetryDelay,
  fetchRedditPosts,
  getAccessToken,
  shouldRetry
};
