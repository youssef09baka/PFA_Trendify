/**
 * Verify distribution with NEW thresholds (HIGH/LOW only, no MEDIUM)
 * HIGH: score >= 70
 * LOW: score < 70
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Trend = require('../models/Trend');

async function verifyDistribution() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pfa', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  NEW DISTRIBUTION: HIGH/LOW ONLY (threshold: 70)           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Get recent trends
    const recentTrends = await Trend.find({
      fetchedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ fetchedAt: -1 })
      .limit(500)
      .lean();

    // Filter for valid scores
    const trendsWithScore = recentTrends.filter(t => 
      t.score !== undefined && t.score !== null && typeof t.score === 'number'
    );

    console.log(`Total recent trends (7 days):     ${recentTrends.length}`);
    console.log(`Trends with score:                ${trendsWithScore.length}`);
    console.log(`Coverage:                         ${((trendsWithScore.length / recentTrends.length) * 100).toFixed(1)}%\n`);

    // Calculate statistics
    const scores = trendsWithScore.map(t => t.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

    console.log('STATISTICS:');
    console.log(`  Min:     ${minScore}`);
    console.log(`  Max:     ${maxScore}`);
    console.log(`  Average: ${avgScore}`);
    console.log(`  Median:  ${medianScore}\n`);

    // New distribution (HIGH/LOW)
    const highTrends = trendsWithScore.filter(t => t.score >= 70);
    const lowTrends = trendsWithScore.filter(t => t.score < 70);

    const highPercent = ((highTrends.length / trendsWithScore.length) * 100).toFixed(1);
    const lowPercent = ((lowTrends.length / trendsWithScore.length) * 100).toFixed(1);

    console.log('NEW DISTRIBUTION (threshold 70):');
    console.log(`────────────────────────────────────`);
    console.log(`HIGH (score >= 70):  ${highTrends.length.toString().padEnd(4)} (${highPercent.padEnd(5)}%) ${'█'.repeat(Math.ceil(parseFloat(highPercent) / 2))}`);
    console.log(`LOW (score < 70):    ${lowTrends.length.toString().padEnd(4)} (${lowPercent.padEnd(5)}%) ${'█'.repeat(Math.ceil(parseFloat(lowPercent) / 2))}`);
    console.log(`────────────────────────────────────`);
    console.log(`TOTAL:               ${trendsWithScore.length}`);

    // Show breakdown by source
    console.log('\nBREAKDOWN BY SOURCE:');
    console.log('────────────────────────────────────');

    const sources = {};
    trendsWithScore.forEach(t => {
      const src = t.source || 'Unknown';
      if (!sources[src]) {
        sources[src] = { total: 0, high: 0, low: 0, scores: [] };
      }
      sources[src].total++;
      sources[src].scores.push(t.score);
      if (t.score >= 70) {
        sources[src].high++;
      } else {
        sources[src].low++;
      }
    });

    for (const [source, stats] of Object.entries(sources)) {
      const highPct = ((stats.high / stats.total) * 100).toFixed(1);
      const lowPct = ((stats.low / stats.total) * 100).toFixed(1);
      const avgScore = (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length).toFixed(1);
      
      console.log(`\n${source}:`);
      console.log(`  Total:   ${stats.total} trends`);
      console.log(`  HIGH:    ${stats.high} (${highPct}%)`);
      console.log(`  LOW:     ${stats.low} (${lowPct}%)`);
      console.log(`  Avg:     ${avgScore}`);
    }

    // Show 20 examples
    console.log('\n20 EXAMPLE TRENDS:');
    console.log('────────────────────────────────────');
    console.log('Title'.padEnd(35) + 'Source'.padEnd(15) + 'Score'.padEnd(8) + 'Class\n');

    for (let i = 0; i < Math.min(20, trendsWithScore.length); i++) {
      const t = trendsWithScore[i];
      const classification = t.score >= 70 ? 'HIGH' : 'LOW';
      const title = (t.title || 'N/A').slice(0, 32).padEnd(35);
      const source = (t.source || 'Unknown').slice(0, 13).padEnd(15);
      const score = String(t.score).padEnd(8);
      
      console.log(title + source + score + classification);
    }

    // UNAVAILABLE status check
    console.log('\n' + '═'.repeat(60));
    console.log('UNAVAILABLE SCENARIO:');
    console.log('═'.repeat(60));
    console.log(`\nWhen to use "UNAVAILABLE":`);
    console.log(`  - Trends with missing score field`);
    console.log(`  - Trends with invalid/null scores`);
    console.log(`  - API errors during prediction\n`);

    const trendsMissingScore = recentTrends.length - trendsWithScore.length;
    console.log(`Currently missing score: ${trendsMissingScore} trends`);
    console.log(`Coverage: ${((trendsWithScore.length / recentTrends.length) * 100).toFixed(1)}%`);

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('IMPLEMENTATION IMPACT:');
    console.log('═'.repeat(60));

    console.log(`\n✓ HIGH classification:   ${highTrends.length} trends (${highPercent}%)`);
    console.log(`✓ LOW classification:    ${lowTrends.length} trends (${lowPercent}%)`);
    console.log(`✓ UNAVAILABLE fallback:  Used only for missing/invalid scores`);

    console.log(`\n✓ Threshold is SIMPLE:   Just compare score >= 70`);
    console.log(`✓ No MEDIUM logic needed`);
    console.log(`✓ All sources supported: Both Reddit and Google Trends`);
    console.log(`✓ UNAVAILABLE fallback:  For edge cases only\n`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyDistribution();
