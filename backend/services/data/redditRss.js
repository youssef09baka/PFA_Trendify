const axios = require('axios');
const Parser = require('rss-parser');

const REDDIT_FETCH_LIMIT = Number(process.env.REDDIT_FETCH_LIMIT || 75);
const parser = new Parser({
  customFields: {
    item: ['media:thumbnail', 'media:content', 'content', 'content:encoded', 'author']
  }
});

const getThumbnail = (entry) => {
  const candidate =
    entry?.['media:thumbnail']?.$?.url ||
    entry?.['media:thumbnail'] ||
    entry?.thumbnail ||
    entry?.enclosure?.url ||
    entry?.image?.url ||
    '';

  return typeof candidate === 'string' ? candidate : '';
};

const fetchRedditPosts = async (subreddit, limit = REDDIT_FETCH_LIMIT) => {
  const requestedLimit = Math.max(10, Number(limit || REDDIT_FETCH_LIMIT));
  const canonicalSubreddit = String(subreddit || '').trim();
  const rssSubreddit = canonicalSubreddit.toLowerCase();
  const url = `https://www.reddit.com/r/${encodeURIComponent(rssSubreddit)}/.rss?limit=${requestedLimit}`;

  console.info(`[Reddit RSS] fetching r/${canonicalSubreddit} from ${url}`);

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true
    });

    if (response.status < 200 || response.status >= 300) {
      const error = new Error(`Reddit RSS request failed with status ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    const feed = await parser.parseString(response.data || '');
    const entries = Array.isArray(feed?.items) ? feed.items : [];

    console.info(`[Reddit RSS] fetched r/${canonicalSubreddit}: status=${response.status}, entries=${entries.length}`);

    const posts = entries
      .map((entry, index) => {
        const title = String(entry.title || '').trim();
        if (!title) return null;

        const link = String(entry.link || '');
        const permalink = link.includes('reddit.com') ? new URL(link).pathname : `/r/${canonicalSubreddit}/comments/${index}`;
        const thumbnail = getThumbnail(entry);
        const selfText = String(entry.contentSnippet || entry.content || entry['content:encoded'] || '').replace(/<[^>]*>/g, ' ').trim();
        const score = Number(entry['reddit:score'] || entry.score || entry.upvotes || 0) || 0;
        const comments = Number(entry['reddit:comments'] || entry.comments || entry.num_comments || 0) || 0;

        return {
          kind: 't3',
          data: {
            title,
            score,
            num_comments: comments,
            created_utc: entry.isoDate ? Math.floor(new Date(entry.isoDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
            selftext: selfText,
            subreddit: canonicalSubreddit,
            permalink,
            url: link || `https://www.reddit.com/r/${canonicalSubreddit}`,
            thumbnail,
            image: thumbnail,
            is_self: false,
            media: null,
            link_flair_text: Array.isArray(entry.categories) && entry.categories.length > 0 ? entry.categories[0] : '',
            author: entry.creator || entry.author || ''
          }
        };
      })
      .filter(Boolean);

    console.info(`[Reddit RSS] produced ${posts.length} valid trends for r/${canonicalSubreddit}`);
    return posts;
  } catch (error) {
    console.error(`[Reddit RSS] failed for r/${canonicalSubreddit}: ${error.message || error}`);
    throw error;
  }
};

module.exports = { fetchRedditPosts };
