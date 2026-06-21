#!/usr/bin/env node

/**
 * AI Provider Migration Guide
 * 
 * Helps you:
 * 1. Run comparison tests
 * 2. Analyze results
 * 3. Select best provider
 * 4. Deploy changes
 * 
 * Usage:
 *   node scripts/ai_provider_guide.js --compare      # Run comparison test
 *   node scripts/ai_provider_guide.js --analyze      # Analyze results
 *   node scripts/ai_provider_guide.js --deploy groq  # Deploy Groq
 *   node scripts/ai_provider_guide.js --deploy openrouter  # Keep OpenRouter
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_FILE = path.join(__dirname, 'ai_comparison_results.json');
const COMPARISON_FILE = path.join(__dirname, '..', 'AI_PROVIDER_COMPARISON.md');
const SERVICE_FILE = path.join(__dirname, '..', 'services', 'aiService.js');
const SERVICE_GROQ_FILE = path.join(__dirname, '..', 'services', 'aiServiceGroq.js');

// Colors for CLI output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.blue}\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

const runComparison = async () => {
  log.header('Running AI Provider Comparison Test');

  try {
    log.info('Starting comparison test (this may take 2-3 minutes)...\n');
    const result = execSync('node scripts/compare_ai_providers.js', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    log.success('Comparison test completed');
  } catch (error) {
    log.error(`Comparison test failed: ${error.message}`);
    process.exit(1);
  }
};

const analyzeResults = () => {
  log.header('Analyzing Results');

  if (!fs.existsSync(RESULTS_FILE)) {
    log.error(`Results file not found: ${RESULTS_FILE}`);
    log.info('Run comparison first: node scripts/ai_provider_guide.js --compare');
    process.exit(1);
  }

  try {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

    console.log(`📊 Comparison Results (${results.timestamp})\n`);
    console.log(`Tested Trends: ${results.trendsCount}\n`);

    // Analyze each provider
    const analysis = {};

    for (const [provider, data] of Object.entries(results.providers)) {
      const successfulResponses = data.responses.filter(r => r.response && r.response.qualityScore);
      
      if (successfulResponses.length > 0) {
        const scores = successfulResponses.map(r => r.response.qualityScore.score);
        const times = successfulResponses.map(r => r.response.responseTime || 0);

        analysis[provider] = {
          avgScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
          minScore: Math.min(...scores),
          maxScore: Math.max(...scores),
          stdDev: calculateStdDev(scores).toFixed(1),
          avgTime: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0) : 0,
          successRate: successfulResponses.length,
          failed: data.responses.filter(r => r.error).length
        };
      }
    }

    // Display comparison table
    console.log('Provider Performance:\n');
    console.log('Provider                  | Avg Score | Min | Max | Speed   | Success');
    console.log('-'.repeat(75));

    const sortedProviders = Object.entries(analysis).sort((a, b) => b[1].avgScore - a[1].avgScore);

    for (const [provider, stats] of sortedProviders) {
      const name = provider.padEnd(24);
      const avgScore = String(stats.avgScore).padStart(8);
      const min = String(stats.minScore).padStart(4);
      const max = String(stats.maxScore).padStart(4);
      const speed = `${stats.avgTime}ms`.padStart(7);
      const success = `${stats.successRate}/${results.trendsCount}`.padStart(7);
      
      console.log(`${name} | ${avgScore} | ${min} | ${max} | ${speed} | ${success}`);
    }

    // Recommendation
    console.log('\n' + '='.repeat(75));
    const [bestProvider, bestStats] = sortedProviders[0];
    
    if (bestStats.avgScore >= 85) {
      log.success(`Recommended Provider: ${bestProvider}`);
      log.info(`Average Score: ${bestStats.avgScore}/100`);
      log.info(`Response Time: ${bestStats.avgTime}ms`);
      log.info(`Success Rate: ${bestStats.successRate}/${results.trendsCount}`);
    } else if (bestStats.avgScore >= 70) {
      log.warn(`${bestProvider} meets minimum requirements (${bestStats.avgScore}/100)`);
      log.warn('Consider reviewing results manually');
    } else {
      log.error('No provider meets minimum quality threshold (70/100)');
      log.info('Review results manually: ' + RESULTS_FILE);
    }

    console.log('\n' + '='.repeat(75));
    console.log(`\nFull results saved to: ${RESULTS_FILE}`);

  } catch (error) {
    log.error(`Failed to analyze results: ${error.message}`);
    process.exit(1);
  }
};

const deployProvider = async (provider) => {
  log.header(`Deploying ${provider} Provider`);

  try {
    if (provider.toLowerCase() === 'groq') {
      log.info('Backing up current aiService.js...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      execSync(`copy ${SERVICE_FILE} ${SERVICE_FILE}.backup.${timestamp}`, { stdio: 'inherit' });
      
      log.info('Deploying aiServiceGroq.js as aiService.js...');
      execSync(`copy ${SERVICE_GROQ_FILE} ${SERVICE_FILE}`, { stdio: 'inherit' });

      log.success('Groq provider deployed!');
      log.info('Update .env: GROQ_API_KEY=your-key-here');
      log.info('Test with: npm start');

    } else if (provider.toLowerCase() === 'openrouter') {
      log.info('Keeping OpenRouter as provider...');
      log.success('OpenRouter provider is active');
      log.info('Update prompts based on comparison insights');

    } else {
      log.error(`Unknown provider: ${provider}`);
      log.info('Valid options: groq, openrouter');
      process.exit(1);
    }

  } catch (error) {
    log.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
};

// Helper functions
const calculateStdDev = (arr) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

if (!command || command === '--help' || command === '-h') {
  console.log(`
AI Provider Migration Guide

Usage:
  node scripts/ai_provider_guide.js --compare       Run comparison test
  node scripts/ai_provider_guide.js --analyze       Analyze comparison results
  node scripts/ai_provider_guide.js --deploy groq   Deploy Groq provider
  node scripts/ai_provider_guide.js --deploy openrouter  Keep OpenRouter

Workflow:
  1. node scripts/ai_provider_guide.js --compare
  2. node scripts/ai_provider_guide.js --analyze
  3. node scripts/ai_provider_guide.js --deploy [provider]
  `);
} else if (command === '--compare') {
  runComparison();
} else if (command === '--analyze') {
  analyzeResults();
} else if (command === '--deploy') {
  if (!param) {
    log.error('Provider required: groq or openrouter');
    process.exit(1);
  }
  deployProvider(param);
} else {
  log.error(`Unknown command: ${command}`);
  process.exit(1);
}
