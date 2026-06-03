const mongoose = require('mongoose');
const config = require('../config/config');
const { fetchRedditPosts } = require('../services/data/redditRss');
const { saveTrends } = require('../services/trendService');

(async () => {
  try {
    await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const rawPosts = await fetchRedditPosts('technology', 1);
    const post = rawPosts[0];
    console.log('\n--- RAW POST DATA ---');
    console.log(Object.keys(post.data));
    console.log({
      title: post.data.title,
      score: post.data.score,
      num_comments: post.data.num_comments,
      permalink: post.data.permalink,
      created_utc: post.data.created_utc
    });

    // Construct trend as redditService would
    const title = post.data.title || '';
    const createdUtc = post.data.created_utc;
    const rawText = '';
    const postLength = rawText.length > 0 ? rawText.length : title.length;
    const sentiment = 0;

    const trend = {
      title,
      popularity: post.data.score || 0,
      growth: post.data.num_comments || 0,
      source: 'Reddit',
      link: 'https://reddit.com' + (post.data.permalink || ''),
      image: '',
      video: '',
      thumbnail: '',
      mediaType: 'none',
      fetchedAt: new Date(),
      _raw: post.data,
      num_comments: post.data.num_comments || 0,
      post_length: postLength,
      hour: createdUtc ? new Date(createdUtc * 1000).getUTCHours() : new Date().getUTCHours(),
      title_length: title.length,
      sentiment,
      tags: [post.data.subreddit].filter(Boolean),
      excerpt: title,
      source_detail: post.data.subreddit
    };

    console.log('\n--- CONSTRUCTED TREND (subset) ---');
    console.log({ title: trend.title, num_comments: trend.num_comments, post_length: trend.post_length, hour: trend.hour, title_length: trend.title_length });

    console.log('\n--- PERSISTING TREND ---');
    const saved = (await saveTrends([trend]))[0];
    console.log('Saved id, slug, num_comments:', saved._id, saved.slug, saved.num_comments);

    const Trend = require('../models/Trend');
    const stored = await Trend.findById(saved._id).lean();
    console.log('\n--- STORED DOC KEYS ---');
    console.log(Object.keys(stored).sort());
    console.log('stored.num_comments:', stored.num_comments);
    console.log('stored._raw present:', Boolean(stored._raw));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
