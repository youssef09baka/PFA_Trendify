/**
 * AI Provider Comparison Test
 * Compares GPT-3.5 (OpenRouter) vs 3 Groq models on 10 real trends
 * 
 * Usage: node scripts/compare_ai_providers.js
 * 
 * Requires:
 * - OPENROUTER_API_KEY in .env
 * - GROQ_API_KEY in .env
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Models
const TrendModel = require('../models/Trend');

// AI Services
const openRouterService = require('../services/aiService');
const groqService = require('../services/aiServiceGroq');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_MODELS = {
  DEEPSEEK: "deepseek-r1-distill-llama-70b",
  QWEN: "qwen-2.5-32b",
  LLAMA: "llama-3.3-70b-versatile"
};

const RESULTS_FILE = path.join(__dirname, '../scripts/ai_comparison_results.json');
const REPORT_FILE = path.join(__dirname, '../AI_PROVIDER_COMPARISON.md');

// Quality scoring function
const scoreResponse = (response) => {
  let score = 0;
  let issues = [];

  // Check summary
  if (!response.summary || response.summary.length < 30) {
    issues.push('Summary too short or empty');
  } else {
    score += 20;
  }

  // Check whyItMatters
  if (!response.whyItMatters || response.whyItMatters.length < 30) {
    issues.push('whyItMatters too short or empty');
  } else {
    score += 20;
  }

  // Check opportunity
  if (!response.opportunity || response.opportunity.length < 20) {
    issues.push('Opportunity too short or empty');
  } else {
    score += 15;
  }

  // Check businessOpportunities
  if (!Array.isArray(response.businessOpportunities) || response.businessOpportunities.length < 3) {
    issues.push('Missing or incomplete businessOpportunities');
  } else {
    const uniqueBizOps = new Set(response.businessOpportunities);
    if (uniqueBizOps.size === response.businessOpportunities.length) {
      score += 15;
    } else {
      issues.push('Duplicate businessOpportunities');
      score += 7;
    }
  }

  // Check contentIdeas
  if (!Array.isArray(response.contentIdeas) || response.contentIdeas.length < 3) {
    issues.push('Missing or incomplete contentIdeas');
  } else {
    const uniqueIdeas = new Set(response.contentIdeas);
    if (uniqueIdeas.size === response.contentIdeas.length) {
      score += 15;
    } else {
      issues.push('Duplicate contentIdeas');
      score += 7;
    }
  }

  // Check for generic phrases (penalty)
  const content = JSON.stringify(response).toLowerCase();
  const genericPhrases = ['monitor this', 'worth watching', 'growing traction', 'gaining visibility', 'momentum', 'social buzz', 'interesting development'];
  const foundGeneric = genericPhrases.filter(p => content.includes(p));
  
  if (foundGeneric.length > 0) {
    issues.push(`Uses generic phrases: ${foundGeneric.join(', ')}`);
    score -= foundGeneric.length * 5;
  }

  // Check distinctness between fields
  const summaryWords = (response.summary || '').toLowerCase().split(' ').slice(0, 5);
  const whyWordsStart = (response.whyItMatters || '').toLowerCase().split(' ').slice(0, 5);
  const overlap = summaryWords.filter(w => whyWordsStart.includes(w)).length;
  
  if (overlap > 2) {
    issues.push('Summary and whyItMatters are too similar');
    score -= 5;
  }

  // Check confidence
  if (!['Low', 'Medium', 'High'].includes(response.confidence)) {
    issues.push('Invalid confidence value');
    score -= 5;
  } else {
    score += 5;
  }

  // Check response time (bonus for speed)
  if (response.responseTime && response.responseTime < 3000) {
    score += 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    passed: issues.length === 0 && score > 70
  };
};

// Main comparison function
const runComparison = async () => {
  console.log('\n🚀 AI Provider Comparison Test Started\n');

  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }

  if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key-here') {
    console.warn('⚠️  GROQ_API_KEY not set or is placeholder - Groq tests will be skipped');
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get 10 real trends
    const trends = await TrendModel.find()
      .sort({ score: -1 })
      .limit(10)
      .lean();

    if (trends.length === 0) {
      console.log('⚠️  No trends found in database');
      process.exit(0);
    }

    console.log(`📊 Testing ${trends.length} trends with 4 AI providers\n`);

    const results = {
      timestamp: new Date().toISOString(),
      trendsCount: trends.length,
      providers: {
        'openrouter-gpt3.5': { responses: [], stats: {} },
        'groq-deepseek': { responses: [], stats: {} },
        'groq-qwen': { responses: [], stats: {} },
        'groq-llama': { responses: [], stats: {} }
      },
      trends: trends.map(t => ({ title: t.title, source: t.source, category: t.category }))
    };

    // Test each trend with each provider
    for (const [index, trend] of trends.entries()) {
      console.log(`\n[${index + 1}/${trends.length}] Testing trend: "${trend.title}"`);

      // OpenRouter GPT-3.5
      try {
        console.log('  → OpenRouter GPT-3.5');
        const gptStart = Date.now();
        const gptResponse = await openRouterService.generateTrendAnalysis(trend);
        gptResponse.responseTime = Date.now() - gptStart;
        
        const gptScore = scoreResponse(gptResponse);
        gptResponse.qualityScore = gptScore;
        results.providers['openrouter-gpt3.5'].responses.push({
          trend: trend.title,
          response: gptResponse,
          score: gptScore
        });
        console.log(`     ✅ Score: ${gptScore.score}/100`);
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
        results.providers['openrouter-gpt3.5'].responses.push({
          trend: trend.title,
          error: error.message
        });
      }

      // Skip Groq tests if API key not set
      if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key-here') {
        console.log('  → Groq models (skipped - no API key)');
        continue;
      }

      // Groq DeepSeek
      try {
        console.log('  → Groq DeepSeek');
        const deepseekStart = Date.now();
        const deepseekResponse = await groqService.generateTrendAnalysisGroq(trend, GROQ_MODELS.DEEPSEEK);
        deepseekResponse.responseTime = Date.now() - deepseekStart;
        
        const deepseekScore = scoreResponse(deepseekResponse);
        deepseekResponse.qualityScore = deepseekScore;
        results.providers['groq-deepseek'].responses.push({
          trend: trend.title,
          response: deepseekResponse,
          score: deepseekScore
        });
        console.log(`     ✅ Score: ${deepseekScore.score}/100 (${deepseekResponse.responseTime}ms)`);
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
        results.providers['groq-deepseek'].responses.push({
          trend: trend.title,
          error: error.message
        });
      }

      // Groq Qwen
      try {
        console.log('  → Groq Qwen');
        const qwenStart = Date.now();
        const qwenResponse = await groqService.generateTrendAnalysisGroq(trend, GROQ_MODELS.QWEN);
        qwenResponse.responseTime = Date.now() - qwenStart;
        
        const qwenScore = scoreResponse(qwenResponse);
        qwenResponse.qualityScore = qwenScore;
        results.providers['groq-qwen'].responses.push({
          trend: trend.title,
          response: qwenResponse,
          score: qwenScore
        });
        console.log(`     ✅ Score: ${qwenScore.score}/100 (${qwenResponse.responseTime}ms)`);
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
        results.providers['groq-qwen'].responses.push({
          trend: trend.title,
          error: error.message
        });
      }

      // Groq Llama
      try {
        console.log('  → Groq Llama');
        const llamaStart = Date.now();
        const llamaResponse = await groqService.generateTrendAnalysisGroq(trend, GROQ_MODELS.LLAMA);
        llamaResponse.responseTime = Date.now() - llamaStart;
        
        const llamaScore = scoreResponse(llamaResponse);
        llamaResponse.qualityScore = llamaScore;
        results.providers['groq-llama'].responses.push({
          trend: trend.title,
          response: llamaResponse,
          score: llamaScore
        });
        console.log(`     ✅ Score: ${llamaScore.score}/100 (${llamaResponse.responseTime}ms)`);
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
        results.providers['groq-llama'].responses.push({
          trend: trend.title,
          error: error.message
        });
      }
    }

    // Calculate statistics for each provider
    for (const [provider, data] of Object.entries(results.providers)) {
      const successfulResponses = data.responses.filter(r => r.response && r.response.qualityScore);
      
      if (successfulResponses.length > 0) {
        const scores = successfulResponses.map(r => r.response.qualityScore.score);
        const times = successfulResponses.map(r => r.response.responseTime || 0);
        
        data.stats = {
          successRate: `${(successfulResponses.length / data.responses.length * 100).toFixed(1)}%`,
          avgScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
          minScore: Math.min(...scores),
          maxScore: Math.max(...scores),
          avgResponseTime: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0) + 'ms' : 'N/A',
          failedResponses: data.responses.filter(r => r.error).length
        };
      }
    }

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to ${RESULTS_FILE}`);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 COMPARISON SUMMARY\n');
    for (const [provider, data] of Object.entries(results.providers)) {
      console.log(`${provider}:`);
      console.log(`  Average Score: ${data.stats.avgScore || 'N/A'}/100`);
      console.log(`  Response Time: ${data.stats.avgResponseTime || 'N/A'}`);
      console.log(`  Success Rate: ${data.stats.successRate || 'N/A'}`);
      console.log();
    }
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('✅ Comparison complete\n');

  } catch (error) {
    console.error('❌ Comparison failed:', error);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  runComparison();
}

module.exports = { scoreResponse, runComparison };
