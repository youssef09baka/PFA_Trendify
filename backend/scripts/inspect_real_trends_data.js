/**
 * INSPECT REAL MONGODB TREND DATA
 * 
 * Shows which fields are ACTUALLY populated in real trend documents
 * for each source type (Google Trends, Reddit, etc)
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Trend = require('../models/Trend');

async function inspectTrendsData() {
  try {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║           REAL MONGODB TREND DATA INSPECTION                             ║
║  Which fields exist? Which are populated? What data types?               ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Get all unique sources
    console.log('\n[STEP 1] Discovering all data sources in database...\n');
    const sources = await Trend.collection.distinct('source');
    console.log(`Found ${sources.length} unique sources:`);
    sources.forEach(s => console.log(`  - "${s}"`));

    // For each source, analyze the data
    console.log('\n[STEP 2] Analyzing fields for EACH source...\n');

    for (const source of sources) {
      console.log(`\n${'='.repeat(75)}`);
      console.log(`SOURCE: "${source}"`);
      console.log(`${'='.repeat(75)}\n`);

      // Get sample documents
      const samples = await Trend.find({ source }).limit(5).lean();
      const count = await Trend.countDocuments({ source });

      console.log(`Total documents: ${count}`);
      console.log(`Sample size: ${Math.min(5, count)}\n`);

      if (samples.length === 0) {
        console.log('No documents found for this source.\n');
        continue;
      }

      // Analyze what fields are populated
      const fieldAnalysis = {};
      const keyFields = [
        'title', 'source', 'category', 'score', 'scoreDetails',
        'popularity', 'growth', 'sentiment',
        'num_comments', 'post_length', 'hour', 'title_length',
        'excerpt', 'analysis', 'idea', 'ml_prediction',
        'image', 'video', 'thumbnail', 'mediaType',
        'link', 'fetchedAt', 'createdAt', 'updatedAt'
      ];

      // Initialize analysis
      for (const field of keyFields) {
        fieldAnalysis[field] = {
          populated: 0,
          empty: 0,
          types: {},
          values: []
        };
      }

      // Analyze each sample
      for (const doc of samples) {
        for (const field of keyFields) {
          const value = doc[field];
          
          if (value === undefined || value === null || value === '') {
            fieldAnalysis[field].empty++;
          } else {
            fieldAnalysis[field].populated++;
            
            const type = Array.isArray(value) ? 'array' : typeof value;
            fieldAnalysis[field].types[type] = (fieldAnalysis[field].types[type] || 0) + 1;
            
            // Store non-sensitive values for inspection
            if (field !== 'analysis' && field !== 'idea' && field !== 'excerpt') {
              if (fieldAnalysis[field].values.length < 2) {
                const displayValue = typeof value === 'string' ? value.slice(0, 50) : value;
                fieldAnalysis[field].values.push(displayValue);
              }
            }
          }
        }
      }

      // Display results
      console.log('FIELD ANALYSIS (from 5 samples):');
      console.log('─'.repeat(75));
      console.log('Field'.padEnd(25) + 'Populated'.padEnd(15) + 'Type(s)'.padEnd(20) + 'Examples');
      console.log('─'.repeat(75));

      for (const field of keyFields) {
        const analysis = fieldAnalysis[field];
        
        if (analysis.populated === 0) {
          console.log(
            field.padEnd(25) +
            '0/5'.padEnd(15) +
            '(empty)'.padEnd(20) +
            '❌ NEVER POPULATED'
          );
        } else {
          const types = Object.keys(analysis.types).join(', ');
          const examples = analysis.values.length > 0 
            ? analysis.values.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')
            : '(no values)';
          
          console.log(
            field.padEnd(25) +
            `${analysis.populated}/5`.padEnd(15) +
            types.padEnd(20) +
            examples
          );
        }
      }

      console.log('');
    }

    // Summary statistics
    console.log(`\n${'='.repeat(75)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(75)}\n`);

    console.log('FIELD AVAILABILITY ACROSS ALL SOURCES:');
    console.log('─'.repeat(75));

    const globalAnalysis = {};
    for (const source of sources) {
      const count = await Trend.countDocuments({ source });
      const withPopularity = await Trend.countDocuments({ source, popularity: { $gt: 0 } });
      const withGrowth = await Trend.countDocuments({ source, growth: { $gt: -999 } }); // Any value
      const withSentiment = await Trend.countDocuments({ source, sentiment: { $ne: 0 } });
      const withNumComments = await Trend.countDocuments({ source, num_comments: { $gt: 0 } });

      console.log(`\n${source}:`);
      console.log(`  Total: ${count}`);
      console.log(`  ├─ popularity > 0: ${withPopularity} (${((withPopularity/count)*100).toFixed(1)}%)`);
      console.log(`  ├─ growth exists: ${withGrowth} (${((withGrowth/count)*100).toFixed(1)}%)`);
      console.log(`  ├─ sentiment ≠ 0: ${withSentiment} (${((withSentiment/count)*100).toFixed(1)}%)`);
      console.log(`  └─ num_comments > 0: ${withNumComments} (${((withNumComments/count)*100).toFixed(1)}%)`);
    }

    console.log('\n' + '='.repeat(75));
    console.log('KEY FINDINGS:');
    console.log('='.repeat(75));
    console.log(`
1. FIELDS ALWAYS AVAILABLE:
   - title (every document)
   - source (every document)
   - score (computed by app)

2. FIELDS AVAILABLE FOR SPECIFIC SOURCES:
   - Check output above for popularity/growth per source

3. FIELDS THAT ARE USUALLY EMPTY:
   - num_comments (especially for RSS/non-Reddit)
   - Check "NEVER POPULATED" entries above

4. RECOMMENDATION:
   - Build classifier using only GUARANTEED fields
   - Use source-specific signals where available
   - Design fallback for missing optional fields
`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

inspectTrendsData();
