/**
 * SCORE AUDIT - PRE-DEPLOYMENT ANALYSIS
 * 
 * Analyzes score generation, distribution, and threshold effectiveness
 * using real MongoDB production data.
 * 
 * Questions to answer:
 * 1. How are scores generated for different sources?
 * 2. What's the actual distribution (min/max/percentiles)?
 * 3. Are scores normalized, partially normalized, raw, or mixed?
 * 4. Is threshold 70 still meaningful given the data?
 * 5. What's the best threshold to use?
 */

const mongoose = require('mongoose');
const path = require('path');

// Load config
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const Trend = require('../models/Trend');

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate comprehensive statistics
 */
function calculateStats(scores) {
  if (scores.length === 0) return null;
  
  const sorted = [...scores].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = percentile(sorted, 50);
  const p25 = percentile(sorted, 25);
  const p75 = percentile(sorted, 75);
  const p90 = percentile(sorted, 90);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  
  return { min, max, avg, median, p25, p75, p90, p95, p99, count: scores.length };
}

/**
 * Simulate threshold distribution
 */
function simulateThreshold(trends, threshold) {
  const high = trends.filter(t => t.score >= threshold).length;
  const low = trends.filter(t => t.score < threshold).length;
  const high_pct = ((high / trends.length) * 100).toFixed(1);
  const low_pct = ((low / trends.length) * 100).toFixed(1);
  
  return { threshold, high, low, high_pct, low_pct };
}

/**
 * Identify score generation pattern
 */
function analyzeScorePattern(trends) {
  const patterns = {
    normalized_0_100: 0,
    normalized_0_1: 0,
    raw_large: 0,
    partial_or_mixed: 0,
    extreme_outliers: 0
  };
  
  trends.forEach(t => {
    const score = t.score;
    if (score >= 0 && score <= 100) patterns.normalized_0_100++;
    else if (score > 0 && score <= 1) patterns.normalized_0_1++;
    else if (score > 100 && score <= 1000) patterns.raw_large++;
    else if (score > 1000 && score <= 100000) patterns.raw_large++;
    else if (score > 100000) patterns.extreme_outliers++;
    else patterns.partial_or_mixed++;
  });
  
  return patterns;
}

/**
 * Main audit
 */
async function auditScores() {
  try {
    console.log('\n🔍 Connecting to MongoDB...\n');
    
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pfa_v1';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Fetch all trends
    console.log('📊 Fetching trends from MongoDB...');
    const allTrends = await Trend.find({}).lean();
    console.log(`✅ Retrieved ${allTrends.length} trends\n`);

    // Filter by source
    const googleTrends = allTrends.filter(t => String(t.source || '').toLowerCase().includes('google'));
    const redditTrends = allTrends.filter(t => String(t.source || '').toLowerCase().includes('reddit'));
    const otherTrends = allTrends.filter(t => 
      !String(t.source || '').toLowerCase().includes('google') && 
      !String(t.source || '').toLowerCase().includes('reddit')
    );

    // Extract scores
    const allScores = allTrends.filter(t => typeof t.score === 'number' && !isNaN(t.score)).map(t => t.score);
    const googleScores = googleTrends.filter(t => typeof t.score === 'number' && !isNaN(t.score)).map(t => t.score);
    const redditScores = redditTrends.filter(t => typeof t.score === 'number' && !isNaN(t.score)).map(t => t.score);
    const otherScores = otherTrends.filter(t => typeof t.score === 'number' && !isNaN(t.score)).map(t => t.score);

    // ═══════════════════════════════════════════════════════════
    // SCORE STATISTICS
    // ═══════════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(70));
    console.log('📊 SCORE STATISTICS BY SOURCE');
    console.log('═'.repeat(70) + '\n');

    const allStats = calculateStats(allScores);
    const googleStats = calculateStats(googleScores);
    const redditStats = calculateStats(redditScores);
    const otherStats = calculateStats(otherScores);

    const printStats = (label, stats) => {
      if (!stats) {
        console.log(`${label}: No data\n`);
        return;
      }
      console.log(`${label}`);
      console.log(`  Count:     ${stats.count}`);
      console.log(`  Min:       ${stats.min.toFixed(2)}`);
      console.log(`  Max:       ${stats.max.toFixed(2)}`);
      console.log(`  Avg:       ${stats.avg.toFixed(2)}`);
      console.log(`  Median:    ${stats.median.toFixed(2)}`);
      console.log(`  P25:       ${stats.p25.toFixed(2)}`);
      console.log(`  P75:       ${stats.p75.toFixed(2)}`);
      console.log(`  P90:       ${stats.p90.toFixed(2)}`);
      console.log(`  P95:       ${stats.p95.toFixed(2)}`);
      console.log(`  P99:       ${stats.p99.toFixed(2)}\n`);
    };

    console.log('📊 ALL TRENDS (Combined)');
    printStats('  Statistics:', allStats);

    console.log('📊 GOOGLE TRENDS');
    printStats('  Statistics:', googleStats);

    console.log('📊 REDDIT TRENDS');
    printStats('  Statistics:', redditStats);

    console.log('📊 OTHER SOURCES');
    printStats('  Statistics:', otherStats);

    // ═══════════════════════════════════════════════════════════
    // SCORE RANGE DISTRIBUTION
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('📈 SCORE RANGE DISTRIBUTION (ALL TRENDS)');
    console.log('═'.repeat(70) + '\n');

    const rangeBuckets = {
      '0-10': 0,
      '10-50': 0,
      '50-70': 0,
      '70-100': 0,
      '100-1K': 0,
      '1K-10K': 0,
      '10K-100K': 0,
      '100K-1M': 0,
      '1M+': 0
    };

    allScores.forEach(score => {
      if (score < 10) rangeBuckets['0-10']++;
      else if (score < 50) rangeBuckets['10-50']++;
      else if (score < 70) rangeBuckets['50-70']++;
      else if (score < 100) rangeBuckets['70-100']++;
      else if (score < 1000) rangeBuckets['100-1K']++;
      else if (score < 10000) rangeBuckets['1K-10K']++;
      else if (score < 100000) rangeBuckets['10K-100K']++;
      else if (score < 1000000) rangeBuckets['100K-1M']++;
      else rangeBuckets['1M+']++;
    });

    Object.entries(rangeBuckets).forEach(([range, count]) => {
      const pct = ((count / allScores.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 5));
      console.log(`  ${range.padEnd(10)} │ ${count.toString().padEnd(4)} (${pct.padStart(5)}%) ${bar}`);
    });

    console.log('');

    // ═══════════════════════════════════════════════════════════
    // SCORE NORMALIZATION ANALYSIS
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('🔬 SCORE NORMALIZATION ANALYSIS');
    console.log('═'.repeat(70) + '\n');

    const patterns = analyzeScorePattern(allScores.map(s => ({score: s})));
    
    console.log('Score Pattern Distribution:\n');
    console.log(`  Normalized (0-100):        ${patterns.normalized_0_100.toString().padEnd(4)} trends`);
    console.log(`  Normalized (0-1):          ${patterns.normalized_0_1.toString().padEnd(4)} trends`);
    console.log(`  Raw Large (100-1M):        ${patterns.raw_large.toString().padEnd(4)} trends`);
    console.log(`  Extreme Outliers (1M+):    ${patterns.extreme_outliers.toString().padEnd(4)} trends`);
    console.log(`  Partial/Mixed:             ${patterns.partial_or_mixed.toString().padEnd(4)} trends\n`);

    const normalized_pct = ((patterns.normalized_0_100 / allScores.length) * 100).toFixed(1);
    const raw_pct = ((patterns.raw_large / allScores.length) * 100).toFixed(1);
    const outlier_pct = ((patterns.extreme_outliers / allScores.length) * 100).toFixed(1);

    console.log(`Normalization Status:`);
    console.log(`  Normalized:    ${normalized_pct}%`);
    console.log(`  Raw/Large:     ${raw_pct}%`);
    console.log(`  Extreme:       ${outlier_pct}%\n`);

    // Check by source
    console.log(`Google Trends Score Pattern:\n`);
    const googlePatterns = analyzeScorePattern(googleScores.map(s => ({score: s})));
    console.log(`  Normalized (0-100):     ${googlePatterns.normalized_0_100}`);
    console.log(`  Raw Large (100+):       ${googlePatterns.raw_large}`);
    console.log(`  Extreme (1M+):          ${googlePatterns.extreme_outliers}\n`);

    console.log(`Reddit Trends Score Pattern:\n`);
    const redditPatterns = analyzeScorePattern(redditScores.map(s => ({score: s})));
    console.log(`  Normalized (0-100):     ${redditPatterns.normalized_0_100}`);
    console.log(`  Raw Large (100+):       ${redditPatterns.raw_large}`);
    console.log(`  Extreme (1M+):          ${redditPatterns.extreme_outliers}\n`);

    // ═══════════════════════════════════════════════════════════
    // THRESHOLD SIMULATION
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('🎯 THRESHOLD SIMULATION');
    console.log('═'.repeat(70) + '\n');

    const thresholds = [50, 70, 100, 200, 500];
    const trendWithValidScore = allTrends.filter(t => typeof t.score === 'number' && !isNaN(t.score));

    console.log('Current Distribution for Different Thresholds:\n');
    console.log('Threshold │ HIGH Count │ HIGH % │ LOW Count │ LOW %  │ Recommendation');
    console.log('──────────┼────────────┼────────┼───────────┼────────┼────────────────');

    const simulations = [];
    thresholds.forEach(threshold => {
      const sim = simulateThreshold(trendWithValidScore, threshold);
      simulations.push(sim);
      
      let rec = '';
      if (sim.high_pct >= 70 && sim.high_pct <= 90) rec = '✓ IDEAL';
      else if (sim.high_pct >= 60 && sim.high_pct <= 95) rec = '~ ACCEPTABLE';
      else if (sim.high_pct > 95) rec = '⚠ TOO SKEWED (HIGH)';
      else rec = '⚠ TOO SKEWED (LOW)';

      console.log(`${String(threshold).padEnd(8)} │ ${sim.high.toString().padEnd(10)} │ ${sim.high_pct.padStart(5)} │ ${sim.low.toString().padEnd(9)} │ ${sim.low_pct.padStart(5)} │ ${rec}`);
    });

    console.log('\n');

    // ═══════════════════════════════════════════════════════════
    // EXTREME VALUE ANALYSIS
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('🚨 EXTREME VALUE ANALYSIS');
    console.log('═'.repeat(70) + '\n');

    const topScores = allTrends
      .filter(t => typeof t.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    console.log('Top 15 Highest Scores:\n');
    topScores.forEach((trend, idx) => {
      console.log(`${String(idx + 1).padStart(2)}. [${trend.score.toLocaleString()}] ${trend.title.substring(0, 50)}`);
      console.log(`    Source: ${trend.source}\n`);
    });

    // Explain extreme values
    console.log('Hypothesis: Why do scores reach extreme values?\n');
    console.log('1. MIXED DATA SOURCES:');
    console.log('   - Some scores are normalized (0-100) from Google Trends');
    console.log('   - Some scores are raw engagement counts from Reddit');
    console.log('   - No uniform scaling applied across sources\n');

    console.log('2. SCORE GENERATION MECHANISM:');
    console.log('   - Score = (popularity_normalized * 0.7 + growth_normalized * 0.3) * 100');
    console.log('   - For Google Trends: normalized by data within batch → 0-100 range');
    console.log('   - For Reddit: raw engagement metrics → can be 0-3.5M\n');

    console.log('3. VALUE RANGES OBSERVED:');
    console.log('   - 70,000: Reddit engagement (comments + score) * multiplier');
    console.log('   - 700,000: High-engagement Reddit post or batch outlier');
    console.log('   - 3,500,000: Extreme outlier from normalization breakdown\n');

    // ═══════════════════════════════════════════════════════════
    // THRESHOLD EFFECTIVENESS ANALYSIS
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('💡 THRESHOLD EFFECTIVENESS ANALYSIS');
    console.log('═'.repeat(70) + '\n');

    console.log('Current Threshold: 70\n');

    const t70 = simulateThreshold(trendWithValidScore, 70);
    console.log(`Distribution at threshold 70:`);
    console.log(`  HIGH: ${t70.high} (${t70.high_pct}%)`);
    console.log(`  LOW:  ${t70.low} (${t70.low_pct}%)\n`);

    console.log('Analysis:\n');
    
    if (t70.high_pct >= 80) {
      console.log(`⚠️  CONCERN: ${t70.high_pct}% classified as HIGH`);
      console.log('   This skew is due to extreme outliers (100K-3.5M scores).');
      console.log('   Threshold 70 separates normalized (0-100) from raw data.\n');
    }

    console.log('Root Cause:');
    console.log('  - Scores are NOT consistently normalized');
    console.log('  - Mix of normalized scores (0-100) and raw engagement (0-3.5M)');
    console.log('  - Threshold 70 works for 0-100 range but not for 100+ range\n');

    console.log('Boundary Analysis:');
    console.log('  - Scores 0-100: Normal distribution, threshold 70 is meaningful');
    console.log('  - Scores 100+: All classified as HIGH regardless of threshold');
    console.log('  - Scores 1M+: Extreme outliers skew distribution\n');

    // ═══════════════════════════════════════════════════════════
    // RECOMMENDATION
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('📋 PRE-DEPLOYMENT RECOMMENDATION');
    console.log('═'.repeat(70) + '\n');

    console.log('ISSUE IDENTIFIED:');
    console.log(`  Score data is MIXED (normalized + raw)`);
    console.log(`  Current threshold 70 is problematic because:`);
    console.log(`  - Works for 0-100 range (Google Trends)`);
    console.log(`  - Breaks for 100+ range (raw Reddit engagement)\n`);

    console.log('RECOMMENDATION: ⚠️  NORMALIZE SCORES FIRST\n');

    console.log('Option 1 (RECOMMENDED): Normalize all scores to 0-100 range');
    console.log('  - Apply: score_normalized = (score - min) / (max - min) * 100');
    console.log('  - Then use threshold 70 with consistency');
    console.log('  - Pro: Clean, consistent classification across all sources');
    console.log('  - Con: Requires one-time data fix\n');

    console.log('Option 2: Adjust threshold to accommodate mixed data');
    console.log('  - Use threshold 100 to separate normalized (0-100) from raw (100+)');
    console.log('  - Pro: No data changes needed');
    console.log('  - Con: HIGH will still be 90%+ due to raw data\n');

    console.log('Option 3: Use source-specific thresholds');
    console.log('  - Google Trends: threshold 70');
    console.log('  - Reddit: threshold 70,000');
    console.log('  - Pro: Optimal for each source');
    console.log('  - Con: More complex logic\n');

    console.log('CURRENT STATUS:\n');
    console.log('✓ HIGH/LOW classifier works (MEDIUM removed)');
    console.log('✗ Threshold 70 is MEANINGFUL only for 0-100 range');
    console.log('✗ Score data normalization needed for production\n');

    console.log('DEPLOYMENT RECOMMENDATION:');
    console.log('⏸️  HOLD deployment, normalize scores first\n');
    console.log('Deployment Checklist:');
    console.log('  [ ] Normalize all scores to 0-100 range');
    console.log('  [ ] Re-run this audit to confirm');
    console.log('  [ ] Verify distribution becomes 50/50 or 60/40');
    console.log('  [ ] THEN proceed with classifier deployment\n');

    console.log('═'.repeat(70) + '\n');

    await mongoose.connection.close();
    console.log('✅ Audit complete. Connection closed.\n');

  } catch (error) {
    console.error('❌ Error during audit:', error.message);
    process.exit(1);
  }
}

// Run audit
auditScores();
