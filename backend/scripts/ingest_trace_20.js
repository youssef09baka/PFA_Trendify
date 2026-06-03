const mongoose = require('mongoose');
const config = require('../config/config');
const { fetchRedditPosts } = require('../services/data/redditRss');
const { saveTrends } = require('../services/trendService');

(async () => {
  try {
    await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const SUBS = ['technology','news','worldnews','gaming','science','business','entertainment','technology','programming','ai','machinelearning','startups','webdev'];
    const collected = [];
    const seen = new Set();

    for (const s of SUBS) {
      if (collected.length >= 20) break;
      try {
        const posts = await fetchRedditPosts(s, 25);
        for (const p of posts) {
          const key = (p && p.data && (p.data.permalink || p.data.title)) || Math.random().toString(36).slice(2);
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push({ raw: p.data, subreddit: s });
          if (collected.length >= 20) break;
        }
      } catch (err) {
        // ignore subreddit fetch errors
      }
    }

    console.log('Collected raw posts:', collected.length);

    const results = [];
    for (let i = 0; i < collected.length; i++) {
      const entry = collected[i];
      const raw = entry.raw || {};
      const raw_num_comments = raw.num_comments === undefined ? null : raw.num_comments;
      const raw_score = raw.score === undefined ? null : raw.score;
      const raw_permalink = raw.permalink || null;
      const raw_subreddit = raw.subreddit || entry.subreddit || null;

      // construct trend like redditService
      const title = raw.title || '';
      const createdUtc = raw.created_utc;
      const rawText = raw.selftext || '';
      const postLength = rawText.length > 0 ? rawText.length : title.length;
      const sentiment = 0;

      const trend = {
        title,
        popularity: raw.score || 0,
        growth: raw.num_comments || 0,
        source: 'Reddit',
        link: `https://reddit.com${raw.permalink || ''}`,
        image: raw.thumbnail || '',
        thumbnail: raw.thumbnail || '',
        mediaType: 'none',
        fetchedAt: new Date(),
        _raw: raw,
        num_comments: raw.num_comments || 0,
        post_length: postLength,
        hour: createdUtc ? new Date(createdUtc * 1000).getUTCHours() : new Date().getUTCHours(),
        title_length: title.length,
        sentiment,
        tags: [raw.subreddit].filter(Boolean),
        excerpt: raw.selftext ? String(raw.selftext).slice(0,220) : title,
        source_detail: raw.subreddit
      };

      // persist via current ingestion path
      const saved = (await saveTrends([trend]))[0];
      const Trend = require('../models/Trend');
      const stored = await Trend.findById(saved._id).lean();

      results.push({
        index: i + 1,
        subreddit: raw_subreddit,
        permalink: raw_permalink,
        raw_num_comments,
        raw_score,
        stored_num_comments: stored ? stored.num_comments : null,
        stored_ml_prediction: stored ? stored.ml_prediction : null,
        title: title
      });
    }

    // print results
    let raw_present = 0, raw_missing = 0, lost_in_pipeline = 0;
    for (const r of results) {
      console.log('\n---[' + r.index + ']---');
      console.log('subreddit:', r.subreddit);
      console.log('permalink:', r.permalink);
      console.log('title:', (r.title||'').replace(/\n/g,' ').slice(0,200));
      console.log('raw.num_comments:', r.raw_num_comments, ' raw.score:', r.raw_score);
      console.log('stored.num_comments:', r.stored_num_comments, ' stored.ml_prediction:', r.stored_ml_prediction);
      if (r.raw_num_comments === null) raw_missing++; else raw_present++;
      if (r.raw_num_comments !== null && (r.stored_num_comments === undefined || r.stored_num_comments === null)) lost_in_pipeline++;
      if (r.raw_num_comments !== null && r.stored_num_comments !== null && Number(r.raw_num_comments) !== Number(r.stored_num_comments)) lost_in_pipeline++;
    }

    console.log('\nSUMMARY:');
    console.log('raw num_comments present:', raw_present);
    console.log('raw num_comments missing:', raw_missing);
    console.log('cases where raw had value but stored is missing/different (lost):', lost_in_pipeline);

    // write full JSON
    const fs = require('fs');
    fs.writeFileSync(require('path').join(__dirname,'ingest_trace_20_report.json'), JSON.stringify({results}, null, 2));
    console.log('\nWrote backend/scripts/ingest_trace_20_report.json');

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
