# AI Provider Comparison Report

**Status**: Template (Run comparison test to populate)  
**Date**: 2026-06-20  
**Objective**: Compare GPT-3.5 (OpenRouter) vs Groq models for trend analysis

---

## SETUP INSTRUCTIONS

### 1. Configure API Keys

Add to `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...  # Already configured
GROQ_API_KEY=gsk_...             # Your Groq API key
GROQ_MODEL=llama-3.3-70b-versatile  # Default model
```

### 2. Get Groq API Key

Visit: https://console.groq.com  
- Create account
- Generate API key
- Add to `.env`

### 3. Run Comparison

```bash
cd backend
node scripts/compare_ai_providers.js
```

This will:
- ✅ Fetch 10 real trends from MongoDB
- ✅ Test each trend with 4 AI providers:
  - OpenRouter GPT-3.5 Turbo
  - Groq DeepSeek R1 (70B)
  - Groq Qwen 2.5 (32B)
  - Groq Llama 3.3 (70B)
- ✅ Score each response on:
  - Summary quality
  - Market impact explanation
  - Business opportunity clarity
  - Content idea distinctness
  - Generic phrase detection
  - Response time
- ✅ Generate results JSON
- ✅ Create this report

---

## EVALUATION CRITERIA

### Quality Scoring (0-100)

Each response scored on:

| Criterion | Max Points | What We Check |
|-----------|-----------|---------------|
| **Summary** | 20 | Clear, trend-specific, not generic |
| **whyItMatters** | 20 | Market impact explanation, different from summary |
| **Opportunity** | 15 | Concrete, realistic, actionable |
| **businessOpportunities** | 15 | Exactly 3, distinct, non-repetitive |
| **contentIdeas** | 15 | Exactly 3, distinct from business ops |
| **Generic phrases** | -25 | Penalty for "monitor", "worth watching", etc. |
| **Confidence** | 5 | Correct format (Low/Medium/High) |
| **Response time** | 5 | Bonus for <3 seconds |

**Pass Threshold**: >70 points and zero critical issues

---

## EXPECTED RESULTS STRUCTURE

### ai_comparison_results.json

```json
{
  "timestamp": "2026-06-20T...",
  "trendsCount": 10,
  "trends": [
    {
      "title": "...",
      "source": "...",
      "category": "..."
    }
  ],
  "providers": {
    "openrouter-gpt3.5": {
      "responses": [
        {
          "trend": "...",
          "response": { ... },
          "score": {
            "score": 85,
            "issues": [],
            "passed": true
          }
        }
      ],
      "stats": {
        "successRate": "100%",
        "avgScore": "82.3",
        "minScore": 75,
        "maxScore": 90,
        "avgResponseTime": "1250ms",
        "failedResponses": 0
      }
    },
    "groq-deepseek": { ... },
    "groq-qwen": { ... },
    "groq-llama": { ... }
  }
}
```

---

## RESULTS SUMMARY

*Results will be populated after running the comparison test.*

### Provider Statistics

| Provider | Avg Score | Response Time | Success Rate | Best For |
|----------|-----------|----------------|--------------|----------|
| **OpenRouter GPT-3.5** | TBD | TBD | TBD | TBD |
| **Groq DeepSeek** | TBD | TBD | TBD | TBD |
| **Groq Qwen** | TBD | TBD | TBD | TBD |
| **Groq Llama** | TBD | TBD | TBD | TBD |

### Detailed Comparison

#### 1. Summary Quality
- Which provider generates the most specific, non-generic summaries?
- Which repeats the trend title instead of analyzing?

#### 2. Market Impact Clarity
- Which best explains economic/commercial significance?
- Which provides the clearest "who wins/loses" analysis?

#### 3. Business Opportunity Quality
- Which generates most realistic, actionable opportunities?
- Which has least repetition between opportunity and businessOpportunities?

#### 4. Content Ideas Distinctness
- Which creates ideas most distinct from business opportunities?
- Which avoids generic suggestions like "create a newsletter"?

#### 5. Generic Phrase Detection
- Which avoids forbidden phrases (monitor, worth watching, traction)?
- Which uses concrete, specific language?

#### 6. Response Time Performance
- Fastest response: ?
- Slowest response: ?
- Best speed/quality ratio: ?

#### 7. Consistency Across Trends
- Which provider maintains quality across all 10 trends?
- Which degrades with complex vs simple trends?

---

## SAMPLE TEST TREND CATEGORIES

The comparison tests on trends from:
- 🏆 Sports
- 💰 Finance/Crypto
- 🤖 AI/Technology
- 📱 Social/Culture
- 🎬 Entertainment
- 🏥 Health/Science
- 🚀 Startups/Business
- 🌍 Politics/Society
- 📊 Data/Analytics
- 🎮 Gaming

---

## RECOMMENDATION CRITERIA

**Best Overall**: Highest average score across quality + speed

**Best for Batch Analysis**: Consistent quality on all trends

**Best for Speed**: Fastest response times without quality loss

**Best for Accuracy**: Highest score on "Business Opportunities" field

**Best for Marketing**: Highest score on "Content Ideas" field

---

## DECISION FRAMEWORK

### Tier 1: Meets All Requirements (>85 avg score)
- ✅ All quality criteria met
- ✅ <2 seconds response time
- ✅ Zero generic phrases
- ✅ **→ Recommend as default**

### Tier 2: Good Quality (70-85 avg score)
- ✅ Most criteria met
- ⚠️ Some minor issues
- ✅ Acceptable response time
- ✅ **→ Use as fallback**

### Tier 3: Acceptable (60-70 avg score)
- ⚠️ Multiple minor issues
- ❌ OR poor response time
- **→ Not recommended**

### Tier 4: Unacceptable (<60 avg score)
- ❌ Critical quality issues
- ❌ Poor structure consistency
- ❌ **→ Reject**

---

## FINAL SELECTION

*To be determined after test execution.*

### Recommended Provider

```
Model: [MODEL_NAME]
Provider: [GROQ|OPENROUTER]
Reason: [Quality score, speed, consistency]
Status: Ready for production deployment
```

### Migration Plan

If Groq selected:
1. ✅ Replace `aiService.js` with `aiServiceGroq.js`
2. ✅ Update all imports in controllers
3. ✅ Verify backward compatibility
4. ✅ Deploy to production
5. ✅ Monitor first 24 hours

If OpenRouter kept:
1. ✅ Keep current implementation
2. ✅ Optimize prompts based on Groq learnings
3. ✅ Consider Groq as future backup

---

## HOW TO RUN

```bash
# 1. Setup API keys (see above)

# 2. Run comparison test
cd backend
node scripts/compare_ai_providers.js

# 3. Results generated:
# - backend/scripts/ai_comparison_results.json
# - backend/AI_PROVIDER_COMPARISON.md (this file updated)

# 4. Review results and make decision

# 5. If migrating to Groq:
node -e "const s = require('./services/aiServiceGroq'); console.log(s.DEFAULT_GROQ_MODEL);"

# 6. Deploy chosen provider
```

---

## NOTES

- Tests run sequentially to avoid rate limiting
- Each trend takes ~10-15 seconds (4 providers)
- Total runtime: ~100-150 seconds for 10 trends
- Results saved immediately for analysis
- No database modifications
- Completely reversible (original aiService.js unchanged)

---

**Status**: Ready for test execution  
**Next Step**: Configure Groq API key and run comparison script  
**Timeline**: ~5 minutes to complete test + analysis
