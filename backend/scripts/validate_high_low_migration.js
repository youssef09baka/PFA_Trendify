/**
 * Runtime Validation: HIGH/LOW/UNAVAILABLE Migration
 * 
 * Analyzes at least 100 real trends from MongoDB using the proposed classifier:
 * - HIGH: score >= 70
 * - LOW: score < 70
 * - UNAVAILABLE: null, NaN, undefined, or invalid score
 * 
 * Outputs:
 * - Distribution counts and percentages
 * - Statistical analysis (min, max, avg, median)
 * - 10 real HIGH examples
 * - 10 real LOW examples
 * - Verification of meaningful distribution
 */

const mongoose = require('mongoose');
const path = require('path');

// Load config
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const Trend = require('../models/Trend');

/**
 * Proposed classifier logic for validation
 */
function classifyWithProposed(trend) {
  if (!trend || typeof trend.score !== 'number') {
    return 'UNAVAILABLE';
  }
  
  const score = trend.score;
  
  if (isNaN(score) || score === null || score === undefined) {
    return 'UNAVAILABLE';
  }
  
  if (score >= 70) {
    return 'HIGH';
  } else {
    return 'LOW';
  }
}

/**
 * Calculate median from sorted array
 */
function calculateMedian(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Main validation
 */
async function validateMigration() {
  try {
    console.log('🔍 Connecting to MongoDB...\n');
    
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pfa_v1';
    console.log(`   URI: ${mongoUri.substring(0, 50)}...\n`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Fetch at least 100 trends
    console.log('📊 Fetching trends from MongoDB...');
    const trends = await Trend.find({}).limit(200).lean();
    console.log(`✅ Retrieved ${trends.length} trends\n`);

    if (trends.length < 100) {
      console.warn(`⚠️  WARNING: Only ${trends.length} trends found. Proceeding with available data.\n`);
    }

    // Classify all trends
    const classified = trends.map(trend => ({
      ...trend,
      proposedClassification: classifyWithProposed(trend)
    }));

    // Separate by classification
    const high = classified.filter(t => t.proposedClassification === 'HIGH');
    const low = classified.filter(t => t.proposedClassification === 'LOW');
    const unavailable = classified.filter(t => t.proposedClassification === 'UNAVAILABLE');

    // Extract valid scores for statistics
    const validScores = classified
      .filter(t => typeof t.score === 'number' && !isNaN(t.score))
      .map(t => t.score)
      .sort((a, b) => a - b);

    // Calculate statistics
    const minScore = validScores.length > 0 ? Math.min(...validScores) : null;
    const maxScore = validScores.length > 0 ? Math.max(...validScores) : null;
    const avgScore = validScores.length > 0 
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)
      : null;
    const medianScore = calculateMedian(validScores);

    const totalTrends = classified.length;
    const highPct = ((high.length / totalTrends) * 100).toFixed(1);
    const lowPct = ((low.length / totalTrends) * 100).toFixed(1);
    const unavailablePct = ((unavailable.length / totalTrends) * 100).toFixed(1);

    // ═══════════════════════════════════════════════════════════
    // REPORT
    // ═══════════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(70));
    console.log('📈 HIGH/LOW/UNAVAILABLE MIGRATION VALIDATION REPORT');
    console.log('═'.repeat(70) + '\n');

    console.log('📊 CLASSIFICATION DISTRIBUTION');
    console.log('─'.repeat(70));
    console.log(`Total Trends Analyzed:  ${totalTrends}`);
    console.log(`Valid Scores:           ${validScores.length}`);
    console.log(`\n  ✅ HIGH (score >= 70):      ${high.length.toString().padStart(3)} (${highPct.padStart(5)}%)`);
    console.log(`  📉 LOW (score < 70):        ${low.length.toString().padStart(3)} (${lowPct.padStart(5)}%)`);
    console.log(`  ⚠️  UNAVAILABLE (invalid):  ${unavailable.length.toString().padStart(3)} (${unavailablePct.padStart(5)}%)\n`);

    console.log('📊 STATISTICAL ANALYSIS (Valid Scores Only)');
    console.log('─'.repeat(70));
    console.log(`Minimum Score:          ${minScore !== null ? minScore.toFixed(2) : 'N/A'}`);
    console.log(`Maximum Score:          ${maxScore !== null ? maxScore.toFixed(2) : 'N/A'}`);
    console.log(`Average Score:          ${avgScore !== null ? avgScore : 'N/A'}`);
    console.log(`Median Score:           ${medianScore !== null ? medianScore.toFixed(2) : 'N/A'}`);
    console.log(`Score Range:            ${minScore !== null ? `${minScore.toFixed(2)} - ${maxScore.toFixed(2)}` : 'N/A'}\n`);

    // Show distribution buckets
    const buckets = {
      '0-10': 0,
      '10-20': 0,
      '20-30': 0,
      '30-40': 0,
      '40-50': 0,
      '50-60': 0,
      '60-70': 0,
      '70-80': 0,
      '80-90': 0,
      '90-100': 0,
      '>100': 0
    };

    validScores.forEach(score => {
      if (score < 10) buckets['0-10']++;
      else if (score < 20) buckets['10-20']++;
      else if (score < 30) buckets['20-30']++;
      else if (score < 40) buckets['30-40']++;
      else if (score < 50) buckets['40-50']++;
      else if (score < 60) buckets['50-60']++;
      else if (score < 70) buckets['60-70']++;
      else if (score < 80) buckets['70-80']++;
      else if (score < 90) buckets['80-90']++;
      else if (score < 100) buckets['90-100']++;
      else buckets['>100']++;
    });

    console.log('📊 SCORE DISTRIBUTION BUCKETS');
    console.log('─'.repeat(70));
    Object.entries(buckets).forEach(([range, count]) => {
      const pct = ((count / validScores.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`  ${range.padEnd(6)} │ ${count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
    });

    console.log('\n');

    // ═══════════════════════════════════════════════════════════
    // HIGH EXAMPLES (top 10)
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('🔥 TOP 10 HIGH POTENTIAL TRENDS (score >= 70)');
    console.log('═'.repeat(70) + '\n');

    const highExamples = high
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    if (highExamples.length === 0) {
      console.log('⚠️  No HIGH trends found.\n');
    } else {
      highExamples.forEach((trend, idx) => {
        console.log(`${String(idx + 1).padStart(2)}. [${trend.score.toFixed(2)}] ${trend.title}`);
        console.log(`    Source: ${trend.source || 'Unknown'} | Category: ${trend.category || 'Unknown'}`);
        console.log(`    ID: ${trend._id}\n`);
      });
    }

    // ═══════════════════════════════════════════════════════════
    // LOW EXAMPLES (bottom 10)
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('📉 BOTTOM 10 LOW POTENTIAL TRENDS (score < 70)');
    console.log('═'.repeat(70) + '\n');

    const lowExamples = low
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    if (lowExamples.length === 0) {
      console.log('⚠️  No LOW trends found.\n');
    } else {
      lowExamples.forEach((trend, idx) => {
        console.log(`${String(idx + 1).padStart(2)}. [${trend.score.toFixed(2)}] ${trend.title}`);
        console.log(`    Source: ${trend.source || 'Unknown'} | Category: ${trend.category || 'Unknown'}`);
        console.log(`    ID: ${trend._id}\n`);
      });
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION VERDICT
    // ═══════════════════════════════════════════════════════════

    console.log('═'.repeat(70));
    console.log('✅ MIGRATION VALIDATION VERDICT');
    console.log('═'.repeat(70) + '\n');

    const isDistributionMeaningful = high.length > 0 && low.length > 0;
    const isNotCollapsed = highPct < 90 && lowPct < 90;
    const hasSufficientData = totalTrends >= 100;
    const scoreRangeSpread = maxScore - minScore;
    const isScoreDifferentiated = scoreRangeSpread > 30;

    console.log(`✓ Sufficient Data:            ${hasSufficientData ? '✅ YES' : '⚠️  ONLY ' + totalTrends} (need >= 100)`);
    console.log(`✓ Distribution Not Collapsed: ${isNotCollapsed ? '✅ YES' : '❌ NO'} (HIGH ${highPct}%, LOW ${lowPct}%)`);
    console.log(`✓ Both Classes Represented:   ${isDistributionMeaningful ? '✅ YES' : '❌ NO'} (HIGH: ${high.length}, LOW: ${low.length})`);
    console.log(`✓ Score Range Meaningful:    ${isScoreDifferentiated ? '✅ YES' : '❌ LIMITED'} (${scoreRangeSpread.toFixed(2)} spread)`);
    console.log(`✓ Unavailable Count:         ${unavailable.length > 0 ? '⚠️  ' + unavailable.length + ' found' : '✅ ZERO'}`);

    const allChecksPassed = isDistributionMeaningful && isNotCollapsed && hasSufficientData && isScoreDifferentiated;

    console.log('\n' + '─'.repeat(70));
    if (allChecksPassed) {
      console.log('✅ VERDICT: Distribution is MEANINGFUL and HEALTHY for migration');
      console.log('   → HIGH/LOW split is balanced and well-differentiated');
      console.log('   → Safe to proceed with classifier implementation\n');
    } else {
      console.log('⚠️  VERDICT: Review distribution before proceeding');
      console.log('   → Check data volume and score spread\n');
    }

    console.log('═'.repeat(70) + '\n');

    await mongoose.connection.close();
    console.log('✅ Validation complete. Connection closed.\n');

  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

// Run validation
validateMigration();
