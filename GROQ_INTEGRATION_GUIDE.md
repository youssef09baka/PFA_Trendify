# Groq AI Integration - Test Branch

**Branch**: fix/feed-performance-persistence  
**Status**: ✅ Implementation Ready for Testing  
**Date**: 2026-06-20

---

## OVERVIEW

This test branch contains a complete Groq integration for AI-powered trend analysis with:

- ✅ **New Service**: `aiServiceGroq.js` with 3 Groq models
- ✅ **Comparison Tool**: Automated tests comparing 4 AI providers
- ✅ **Analysis Framework**: Quality scoring and evaluation system
- ✅ **Deployment Script**: One-command migration between providers
- ✅ **Backward Compatible**: Original `aiService.js` unchanged
- ✅ **Zero Business Logic Changes**: Only AI provider swapped

---

## FILES CREATED

### New Services

| File | Purpose |
|------|---------|
| `backend/services/aiServiceGroq.js` | Groq provider with 3 models |
| `backend/scripts/compare_ai_providers.js` | Automated comparison test |
| `backend/scripts/ai_provider_guide.js` | Migration helper CLI |

### Documentation

| File | Purpose |
|------|---------|
| `AI_PROVIDER_COMPARISON.md` | Comparison report (populated after test) |
| `GROQ_INTEGRATION_GUIDE.md` | This file |

### Configuration

| File | Change |
|------|--------|
| `backend/.env` | Added GROQ_API_KEY, GROQ_MODEL |

---

## QUICK START

### Step 1: Get Groq API Key

```bash
# Visit: https://console.groq.com
# Create account
# Generate API key
# Copy to clipboard
```

### Step 2: Configure .env

```bash
# Edit backend/.env
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Step 3: Run Comparison Test

```bash
cd backend
node scripts/ai_provider_guide.js --compare
```

**Expected Output**:
- 🚀 Tests 10 real trends from database
- ⏱️ Takes ~2-3 minutes
- 📊 Generates results JSON
- ✅ Shows comparison summary

### Step 4: Analyze Results

```bash
node scripts/ai_provider_guide.js --analyze
```

**Output**: Provider performance table + recommendation

### Step 5: Deploy Best Provider

```bash
# If Groq wins:
node scripts/ai_provider_guide.js --deploy groq

# If OpenRouter keeps advantage:
node scripts/ai_provider_guide.js --deploy openrouter
```

---

## GROQ MODELS INCLUDED

| Model | Optimized For | Speed | Size |
|-------|---------------|-------|------|
| **deepseek-r1-distill-llama-70b** | Reasoning | Slow | Large |
| **qwen-2.5-32b** | Balance | Fast | Medium |
| **llama-3.3-70b-versatile** | General | Medium | Large |

---

## COMPARISON METHODOLOGY

### What Gets Tested

For each of 10 real database trends:
- OpenRouter GPT-3.5 Turbo
- Groq DeepSeek R1 (70B)
- Groq Qwen 2.5 (32B)
- Groq Llama 3.3 (70B)

### Quality Scoring (0-100)

```
+ 20 points: Summary quality
+ 20 points: Market impact explanation (whyItMatters)
+ 15 points: Business opportunity clarity
+ 15 points: 3 distinct business opportunities
+ 15 points: 3 distinct content ideas
+  5 points: Correct confidence format
+  5 points: Response time <3 seconds
- 25 points: Generic phrases (monitor, worth watching, etc.)
- 10 points: Repeated content across fields
```

### Pass Criteria

```
✅ Average Score: ≥70/100
✅ Success Rate: ≥90%
✅ Zero critical issues
✅ Response time: <5 seconds
```

---

## RESULTS INTERPRETATION

### Best Overall Provider

Highest average score across quality + speed metrics

### Performance Metrics

| Metric | What It Means |
|--------|--------------|
| **Avg Score** | Overall quality consistency |
| **Min/Max Score** | Performance range (lower variance = better) |
| **Avg Response Time** | Speed (lower = better) |
| **Success Rate** | Reliability (higher = better) |

### Sample Results Format

```
Provider                  | Avg Score | Min | Max | Speed   | Success
---------------------------------------------------------------------------
groq-llama                |      87.2 |  82 |  92 | 1450ms  |   10/10
openrouter-gpt3.5         |      85.1 |  78 |  90 | 2100ms  |   10/10
groq-qwen                 |      81.3 |  75 |  88 | 950ms   |   10/10
groq-deepseek             |      79.5 |  70 |  85 | 3200ms  |   9/10
```

---

## DEPLOYMENT PROCESS

### Option A: Deploy Groq (if it wins)

```bash
node scripts/ai_provider_guide.js --deploy groq

# What happens:
# 1. Backup current aiService.js → aiService.js.backup.timestamp
# 2. Copy aiServiceGroq.js → aiService.js
# 3. Existing code imports remain unchanged (same interface)
# 4. All controllers use Groq automatically
```

### Option B: Keep OpenRouter (if it wins)

```bash
node scripts/ai_provider_guide.js --deploy openrouter

# What happens:
# 1. No file changes
# 2. Existing aiService.js remains active
# 3. Optimize prompts based on comparison insights
```

---

## INTERFACE COMPATIBILITY

### Before Migration

```javascript
// controllers/trendController.js
const aiService = require('../services/aiService');

const analysis = await aiService.generateTrendAnalysis(trend);
// {
//   status: 'openrouter',
//   summary: '...',
//   whyItMatters: '...',
//   opportunity: '...',
//   businessOpportunities: [...],
//   contentIdeas: [...],
//   confidence: 'Medium'
// }
```

### After Migration (if Groq selected)

```javascript
// controllers/trendController.js
const aiService = require('../services/aiService');  // ← Same import!

const analysis = await aiService.generateTrendAnalysis(trend);
// {
//   status: 'groq',
//   model: 'llama-3.3-70b-versatile',
//   responseTime: 1450,
//   summary: '...',
//   whyItMatters: '...',
//   opportunity: '...',
//   businessOpportunities: [...],
//   contentIdeas: [...],
//   confidence: 'Medium'
// }
```

**Result**: ✅ **Zero code changes needed** (same interface)

---

## TESTING THE INTEGRATION

### Unit Test (Single Trend)

```bash
cd backend
node -e "
const groq = require('./services/aiServiceGroq');
const trend = { 
  title: 'Bitcoin hits $50k', 
  category: 'Finance',
  source: 'Reddit'
};
groq.generateTrendAnalysisGroq(trend, 'llama-3.3-70b-versatile')
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error(e));
"
```

### Fallback Test (No API Key)

```bash
# Temporarily remove GROQ_API_KEY from .env
# Run trend analysis - should use fallback content
# Restore GROQ_API_KEY
```

---

## TROUBLESHOOTING

### Issue: "GROQ_API_KEY not set"

**Solution**:
```bash
# Edit backend/.env
GROQ_API_KEY=gsk_your_actual_key_from_console_groq_com

# Don't use placeholder - get actual key from console.groq.com
```

### Issue: Comparison Test Fails

**Troubleshoot**:
```bash
# 1. Check MongoDB connection
npm test  # or manual: node -e "require('./config/db').connect()"

# 2. Verify API keys
echo $OPENROUTER_API_KEY
echo $GROQ_API_KEY

# 3. Run single model test
node -e "const s=require('./services/aiService'); ..." 

# 4. Check for rate limits
# Wait 30 seconds and retry
```

### Issue: "No trends found in database"

**Solution**:
```bash
# Run data import first
node scripts/validate_reddit_ml.js  # or similar data script

# Or manually add test trend
# db.trends.insertOne({title:"Test",source:"Reddit",category:"Tech"})
```

---

## NEXT STEPS

1. **Run Comparison** (if you have Groq API key):
   ```bash
   node scripts/ai_provider_guide.js --compare
   ```

2. **Analyze Results**:
   ```bash
   node scripts/ai_provider_guide.js --analyze
   ```

3. **Choose Best Provider**:
   - If Groq ≥70 avg score AND faster: Deploy Groq
   - If OpenRouter ≥70 avg score: Keep OpenRouter
   - If neither meets criteria: Optimize prompts in both

4. **Deploy Selected Provider**:
   ```bash
   node scripts/ai_provider_guide.js --deploy [groq|openrouter]
   ```

5. **Verify in Production**:
   ```bash
   npm start
   # Test feed endpoint
   curl http://localhost:3000/api/feed
   # Check AI analysis fields populated
   ```

---

## ROLLBACK (If Needed)

```bash
# If Groq deployment causes issues:

# Option 1: Restore from backup
cp backend/services/aiService.js.backup.* backend/services/aiService.js
npm start

# Option 2: Redeploy OpenRouter
node scripts/ai_provider_guide.js --deploy openrouter
npm start
```

---

## PERFORMANCE EXPECTATIONS

### OpenRouter GPT-3.5
- **Cost**: ~$0.0005 per request
- **Speed**: 1.5-3 seconds per trend
- **Quality**: Production-proven, consistent
- **Latency**: Adds 1.5-3s to feed request

### Groq Llama 3.3 (Most Likely Best)
- **Cost**: $0 during free tier
- **Speed**: 0.8-1.5 seconds per trend
- **Quality**: Comparable to GPT-3.5
- **Latency**: Adds 0.8-1.5s to feed request

### Groq Qwen 2.5 (Fastest)
- **Cost**: $0 during free tier
- **Speed**: 0.5-1 second per trend
- **Quality**: Good, slightly less detail
- **Latency**: Adds 0.5-1s to feed request

---

## COST ANALYSIS

### Current: OpenRouter GPT-3.5
- Per trend: $0.0005
- 10,000 trends/month: $5
- Annual: $60

### Proposed: Groq Llama (Free Tier)
- Per trend: $0 (free during trial)
- After free tier: ~$0.00001 (99% cheaper)
- Annual savings: $60+

**Result**: ✅ **Significant cost reduction + better speed**

---

## DOCUMENTATION

- **Detailed Setup**: See `AI_PROVIDER_COMPARISON.md`
- **API Reference**: See `backend/services/aiServiceGroq.js` JSDoc
- **Test Results**: See `backend/scripts/ai_comparison_results.json`
- **Performance**: See comparison table after test runs

---

## SUPPORT

### Questions About Integration?
- Check `aiServiceGroq.js` JSDoc comments
- Review `compare_ai_providers.js` scoring logic
- See `ai_provider_guide.js` for CLI options

### Need to Switch Back?
- Deploy commands: `--deploy openrouter`
- Backups preserved: `aiService.js.backup.*`
- Zero downtime: Just redeploy

---

## SUMMARY

✅ **What You Get**:
- Fast, reliable AI analysis via Groq
- Automatic model comparison & selection
- One-command deployment
- Complete rollback capability
- Zero business logic changes
- Significant cost savings potential

✅ **Status**: Ready for testing

✅ **Next**: Get Groq API key → Run comparison → Deploy best provider

---

**Document**: GROQ_INTEGRATION_GUIDE.md  
**Status**: Setup complete, ready for testing  
**Branch**: fix/feed-performance-persistence
