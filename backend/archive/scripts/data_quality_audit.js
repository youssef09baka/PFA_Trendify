const mongoose = require('mongoose');
const Trend = require('../models/Trend');
require('dotenv').config();

const CATEGORY_KEYWORDS = {
  'AI': ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'llm', 'machine learning', 'neural', 'automation', 'robot', 'gpt'],
  'Startups': ['startup', 'founder', 'launch', 'incubator', 'accelerator', 'scaleup', 'seed', 'unicorn'],
  'Tech': ['tech', 'software', 'hardware', 'cloud', 'chip', 'device', 'platform', 'developer', 'cyber'],
  'Gaming': ['game', 'gaming', 'esport', 'playstation', 'xbox', 'nintendo', 'twitch', 'fortnite', 'league of legends', 'mario'],
  'Business': ['business', 'deal', 'strategy', 'market', 'growth', 'revenue'],
  'Finance': ['finance', 'stock', 'crypto', 'investment', 'economy', 'bank', 'earnings', 'funding', 'bitcoin', 'ethereum'],
  'Social': ['social media', 'instagram', 'facebook', 'twitter', 'tiktok', 'viral', 'influencer', 'community', 'post', 'reel'],
  'Science': ['science', 'research', 'study', 'space', 'biology', 'climate', 'health', 'physics', 'medicine', 'genetics'],
  'Entertainment': ['movie', 'music', 'tv', 'film', 'celebrity', 'show', 'festival', 'entertainment', 'concert', 'series'],
  'Web culture': ['meme', 'viral', 'trend', 'internet', 'community', 'subculture', 'web3', 'digital culture', 'meta', 'hype']
};

const inferCategoryFromTitle = (title) => {
  const lower = String(title || '').toLowerCase();
  for (const [category, terms] of Object.entries(CATEGORY_KEYWORDS)) {
    if (terms.some((term) => lower.includes(term))) {
      return category;
    }
  }
  return null;
};

const detectCategoryIssue = (trend) => {
  const inferred = inferCategoryFromTitle(trend.title);
  const actual = String(trend.category || '').trim();
  
  if (!inferred) return null; // no keywords detected
  if (inferred.toLowerCase() === actual.toLowerCase()) return null; // match
  
  return {
    id: trend._id,
    title: trend.title,
    actual: actual,
    inferred: inferred,
    severity: 'MEDIUM'
  };
};

const detectTagIssues = (trend) => {
  const issues = [];
  const tags = Array.isArray(trend.tags) ? trend.tags : [];
  
  // Generic tags
  const genericTags = ['trend', 'viral', 'new', 'popular', 'hot', 'interesting', 'amazing', 'update'];
  const hasGeneric = tags.filter(t => genericTags.includes(String(t).toLowerCase()));
  if (hasGeneric.length > 0) {
    issues.push({ type: 'GENERIC_TAGS', value: hasGeneric });
  }
  
  // Duplicates
  const unique = new Set(tags.map(t => String(t).toLowerCase()));
  if (unique.size < tags.length) {
    issues.push({ type: 'DUPLICATE_TAGS', count: tags.length - unique.size });
  }
  
  // Too few tags
  if (tags.length === 0) {
    issues.push({ type: 'NO_TAGS', value: true });
  }
  
  return issues.length > 0 ? issues : null;
};

const detectScorePredictionMismatch = (trend) => {
  const score = trend.score || 0;
  const pred = String(trend.ml_prediction || '').trim();
  
  const shouldBeHigh = score >= 70;
  const isHigh = pred === 'HIGH';
  const isLow = pred === 'LOW';
  
  // HIGH score but LOW/UNAVAILABLE prediction
  if (shouldBeHigh && !isHigh) {
    return {
      id: trend._id,
      title: trend.title,
      score: score,
      prediction: pred,
      issue: 'HIGH_SCORE_BUT_LOW_PREDICTION',
      severity: 'HIGH'
    };
  }
  
  // LOW score but HIGH prediction
  if (!shouldBeHigh && isHigh) {
    return {
      id: trend._id,
      title: trend.title,
      score: score,
      prediction: pred,
      issue: 'LOW_SCORE_BUT_HIGH_PREDICTION',
      severity: 'HIGH'
    };
  }
  
  return null;
};

const detectSourceMismatch = (trend) => {
  const source = String(trend.source || '').toLowerCase();
  const title = String(trend.title || '').toLowerCase();
  
  // Reddit trend but title doesn't match Reddit pattern
  if (source.includes('reddit')) {
    if (!title.includes('reddit') && !source.includes('r/') && title.length < 20) {
      return {
        id: trend._id,
        title: trend.title,
        source: trend.source,
        issue: 'REDDIT_SOURCE_MISMATCH'
      };
    }
  }
  
  return null;
};

const detectMediaIssues = (trend) => {
  const mediaType = String(trend.mediaType || 'none');
  const hasImage = Boolean(trend.image && String(trend.image).trim());
  const hasVideo = Boolean(trend.video && String(trend.video).trim());
  const hasThumbnail = Boolean(trend.thumbnail && String(trend.thumbnail).trim());
  
  if (mediaType === 'image' && !hasImage && !hasThumbnail) {
    return {
      id: trend._id,
      title: trend.title,
      mediaType: mediaType,
      issue: 'IMAGE_TYPE_BUT_NO_MEDIA',
      severity: 'MEDIUM'
    };
  }
  
  if (mediaType === 'video' && !hasVideo) {
    return {
      id: trend._id,
      title: trend.title,
      mediaType: mediaType,
      issue: 'VIDEO_TYPE_BUT_NO_VIDEO',
      severity: 'MEDIUM'
    };
  }
  
  return null;
};

const detectUIAbsurdities = (trend) => {
  const issues = [];
  
  // UNKNOWN values
  if (String(trend.ml_prediction) === 'UNKNOWN') {
    issues.push('UNKNOWN_PREDICTION');
  }
  
  // Empty or placeholder analysis
  if (!trend.analysis || String(trend.analysis).length < 20) {
    issues.push('EMPTY_OR_SHORT_ANALYSIS');
  }
  
  // Empty idea
  if (!trend.idea || String(trend.idea).length < 10) {
    issues.push('EMPTY_OR_SHORT_IDEA');
  }
  
  // Empty title
  if (!trend.title || String(trend.title).length < 5) {
    issues.push('TOO_SHORT_TITLE');
  }
  
  // Empty or placeholder media
  if (!trend.image && !trend.video && !trend.thumbnail) {
    issues.push('NO_MEDIA');
  }
  
  // Score 0
  if (trend.score === 0) {
    issues.push('ZERO_SCORE');
  }
  
  return issues.length > 0 ? issues : null;
};

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('[AUDIT] Starting data quality audit...\n');
    
    // Sample size
    const sampleSize = 500;
    const trends = await Trend.find().sort({ createdAt: -1 }).limit(sampleSize).lean();
    
    console.log(`[AUDIT] Sampled ${trends.length} trends\n`);
    
    const results = {
      categoryMismatches: [],
      tagIssues: [],
      scorePredictionMismatches: [],
      sourceMismatches: [],
      mediaIssues: [],
      uiAbsurdities: [],
      summaryStats: {
        totalTrends: trends.length,
        trendsBySource: {},
        trendsByCategory: {},
        trendsByPrediction: {},
        avgScore: 0,
        emptyAnalysis: 0,
        emptyIdea: 0,
        emptyMedia: 0
      }
    };
    
    let scoreSum = 0;
    let emptyAnalysisCount = 0;
    let emptyIdeaCount = 0;
    let emptyMediaCount = 0;
    
    for (const trend of trends) {
      // Category issues
      const catIssue = detectCategoryIssue(trend);
      if (catIssue) results.categoryMismatches.push(catIssue);
      
      // Tag issues
      const tagIssue = detectTagIssues(trend);
      if (tagIssue) {
        results.tagIssues.push({
          id: trend._id,
          title: trend.title,
          tags: trend.tags,
          issues: tagIssue
        });
      }
      
      // Score/prediction issues
      const scorePredIssue = detectScorePredictionMismatch(trend);
      if (scorePredIssue) results.scorePredictionMismatches.push(scorePredIssue);
      
      // Source issues
      const srcIssue = detectSourceMismatch(trend);
      if (srcIssue) results.sourceMismatches.push(srcIssue);
      
      // Media issues
      const mediaIssue = detectMediaIssues(trend);
      if (mediaIssue) results.mediaIssues.push(mediaIssue);
      
      // UI absurdities
      const absurdities = detectUIAbsurdities(trend);
      if (absurdities) {
        results.uiAbsurdities.push({
          id: trend._id,
          title: trend.title,
          issues: absurdities
        });
      }
      
      // Summary stats
      const source = trend.source || 'UNKNOWN';
      results.summaryStats.trendsBySource[source] = (results.summaryStats.trendsBySource[source] || 0) + 1;
      
      const category = trend.category || 'UNKNOWN';
      results.summaryStats.trendsByCategory[category] = (results.summaryStats.trendsByCategory[category] || 0) + 1;
      
      const pred = trend.ml_prediction || 'UNKNOWN';
      results.summaryStats.trendsByPrediction[pred] = (results.summaryStats.trendsByPrediction[pred] || 0) + 1;
      
      scoreSum += trend.score || 0;
      if (!trend.analysis || String(trend.analysis).length === 0) emptyAnalysisCount++;
      if (!trend.idea || String(trend.idea).length === 0) emptyIdeaCount++;
      if (!trend.image && !trend.video && !trend.thumbnail) emptyMediaCount++;
    }
    
    results.summaryStats.avgScore = (scoreSum / trends.length).toFixed(2);
    results.summaryStats.emptyAnalysis = emptyAnalysisCount;
    results.summaryStats.emptyIdea = emptyIdeaCount;
    results.summaryStats.emptyMedia = emptyMediaCount;
    
    // Write results
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, 'data_quality_audit_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    console.log('\n[AUDIT] Results written to', reportPath, '\n');
    console.log(`[SUMMARY]`);
    console.log(`- Category Mismatches: ${results.categoryMismatches.length}`);
    console.log(`- Tag Issues: ${results.tagIssues.length}`);
    console.log(`- Score/Prediction Mismatches: ${results.scorePredictionMismatches.length}`);
    console.log(`- Source Mismatches: ${results.sourceMismatches.length}`);
    console.log(`- Media Issues: ${results.mediaIssues.length}`);
    console.log(`- UI Absurdities: ${results.uiAbsurdities.length}`);
    console.log(`\n[STATS]`);
    console.log(`- Avg Score: ${results.summaryStats.avgScore}`);
    console.log(`- Empty Analysis: ${emptyAnalysisCount}`);
    console.log(`- Empty Idea: ${emptyIdeaCount}`);
    console.log(`- Empty Media: ${emptyMediaCount}`);
    console.log(`\n[SOURCES]`, JSON.stringify(results.summaryStats.trendsBySource, null, 2));
    console.log(`\n[CATEGORIES]`, JSON.stringify(results.summaryStats.trendsByCategory, null, 2));
    console.log(`\n[PREDICTIONS]`, JSON.stringify(results.summaryStats.trendsByPrediction, null, 2));
    
  } catch (err) {
    console.error('[ERROR]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
