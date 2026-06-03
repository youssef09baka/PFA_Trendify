const axios = require('axios');
const { fetchRedditPosts: fetchRedditPostsFromRss } = require('./redditRss');
const {
  REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET,
  REDDIT_USERNAME,
  REDDIT_PASSWORD,
  REDDIT_USER_AGENT,
  REDDIT_FETCH_LIMIT,
  REDDIT_MAX_RETRIES
} = require('../../config/config');

let cachedAccessToken = null;
let cachedTokenExpiration = 0;

const hasOAuthConfig = () => Boolean(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET && REDDIT_USER_AGENT);

const buildTokenRequestBody = () => {
  const body = new URLSearchParams();
  if (REDDIT_USERNAME && REDDIT_PASSWORD) {
    body.append('grant_type', 'password');
    body.append('username', REDDIT_USERNAME);
    body.append('password', REDDIT_PASSWORD);
  } else {
    body.append('grant_type', 'client_credentials');
  }
  return body.toString();
};

const getRedditAccessToken = async () => {
  if (!hasOAuthConfig()) {
    throw new Error('Missing Reddit OAuth configuration: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET and REDDIT_USER_AGENT are required.');
  }

  if (cachedAccessToken && Date.now() + 60000 < cachedTokenExpiration) {
    return cachedAccessToken;
  }

  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const body = buildTokenRequestBody();

  const response = await axios.post('https://www.reddit.com/api/v1/access_token', body, {
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': REDDIT_USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 30000,
    validateStatus: () => true
  });

  if (response.status !== 200 || !response.data || !response.data.access_token) {
    const errorMessage = response.data?.error || response.data?.error_description || response.statusText || 'Unknown Reddit auth error';
    throw new Error(`Reddit token request failed (${response.status}): ${errorMessage}`);
  }

  cachedAccessToken = response.data.access_token;
  const expiresIn = Number(response.data.expires_in) || 3600;
  cachedTokenExpiration = Date.now() + expiresIn * 1000;
  return cachedAccessToken;
};

const normalizeThumbnail = (postData) => {
  if (!postData || typeof postData !== 'object') return '';
  if (typeof postData.thumbnail === 'string' && postData.thumbnail.startsWith('http')) {
    return postData.thumbnail;
  }
  if (postData.preview && Array.isArray(postData.preview.images) && postData.preview.images.length > 0) {
    const source = postData.preview.images[0].source;
    if (source && typeof source.url === 'string') {
      return source.url.replace(/&amp;/g, '&');
    }
  }
  return '';
};

const fetchRedditPosts = async (subreddit, limit = REDDIT_FETCH_LIMIT) => {
  const requestedLimit = Math.max(10, Number(limit || REDDIT_FETCH_LIMIT));
  const canonicalSubreddit = String(subreddit || '').trim();

  if (!canonicalSubreddit) {
    return [];
  }

  if (!hasOAuthConfig()) {
    console.warn('[Reddit API] OAuth configuration missing, falling back to RSS ingestion');
    return fetchRedditPostsFromRss(canonicalSubreddit, requestedLimit);
  }

  const url = `https://oauth.reddit.com/r/${encodeURIComponent(canonicalSubreddit)}/hot?limit=${requestedLimit}`;

  let lastError;
  for (let attempt = 0; attempt < Math.max(1, REDDIT_MAX_RETRIES); attempt += 1) {
    try {
      const token = await getRedditAccessToken();
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': REDDIT_USER_AGENT
        },
        timeout: 30000,
        validateStatus: () => true
      });

      if (response.status === 401 || response.status === 403) {
        cachedAccessToken = null;
        lastError = new Error(`Reddit API auth failed (${response.status})`);
        continue;
      }

      if (response.status !== 200) {
        lastError = new Error(`Reddit API request failed (${response.status})`);
        continue;
      }

      const items = response.data?.data?.children;
      if (!Array.isArray(items)) {
        throw new Error('Reddit API response missing data.children');
      }

      return items
        .map((child) => {
          if (!child || !child.data) return null;
          const postData = child.data;
          const title = String(postData.title || '').trim();
          if (!title) return null;

          const permalink = String(postData.permalink || '').trim();
          const normalizedPermalink = permalink.startsWith('/') ? permalink : `/${permalink}`;
          const urlField = String(postData.url_overridden_by_dest || postData.url || '').trim();
          const thumbnail = normalizeThumbnail(postData);

          return {
            kind: 't3',
            data: {
              title,
              score: Number(postData.score) || 0,
              num_comments: Number(postData.num_comments) || 0,
              created_utc: Number(postData.created_utc) || Math.floor(Date.now() / 1000),
              selftext: String(postData.selftext || '').trim(),
              subreddit: String(postData.subreddit || canonicalSubreddit).trim(),
              permalink: normalizedPermalink,
              url: urlField || `https://reddit.com${normalizedPermalink}`,
              thumbnail,
              image: thumbnail,
              is_self: Boolean(postData.is_self),
              media: postData.media || null,
              link_flair_text: postData.link_flair_text || '',
              author: postData.author || ''
            }
          };
        })
        .filter(Boolean);
    } catch (error) {
      lastError = error;
      if (attempt < REDDIT_MAX_RETRIES - 1) {
        console.warn(`[Reddit API] attempt ${attempt + 1} failed for r/${canonicalSubreddit}: ${error.message}`);
      }
    }
  }

  if (lastError) {
    console.warn(`[Reddit API] falling back to RSS after ${REDDIT_MAX_RETRIES} attempts for r/${canonicalSubreddit}: ${lastError.message}`);
    return fetchRedditPostsFromRss(canonicalSubreddit, requestedLimit);
  }

  return [];
};

module.exports = {
  fetchRedditPosts
};
