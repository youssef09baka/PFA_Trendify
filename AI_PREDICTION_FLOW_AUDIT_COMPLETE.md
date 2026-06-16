# AI PREDICTION FLOW AUDIT - COMPLETE EXECUTION PATH TRACE

**Status**: ✅ AUDIT COMPLETE - ROOT CAUSE IDENTIFIED  
**Date**: Current Session  
**Scope**: Trace execution path for "Prediction unavailable" display in AIWorkspace  
**User Scenario**: Click trend (score=67) from Feed → Click "Analyze with AI" → View AIWorkspace

---

## SECTION 1: EXECUTION PATH TRACE

### Step 1: User Clicks Trend from Feed
**User Action**: Click trend with score=67 from Feed.jsx  
**API Call**: `GET /feed/:id` (called by TrendDetail.jsx line 43)  
**Backend Handler**: [feedController.js](backend/controllers/feedController.js) `getTrendDetail()` (line 151)  
**Response Structure**:
```javascript
{
  _id: "...",
  title: "...",
  score: 67,
  ml_prediction: "LOW",  // ← STRING from trendController scoring
  analysis: "...",
  idea: "...",
  // ... other fields
}
```
**Frontend Receives**: `trend.ml_prediction = "LOW"` (string)  
**Rendering in TrendDetail.jsx Line 176**:
```jsx
{trend.ml_prediction === 'HIGH' ? '🔥 HIGH POTENTIAL' : 
 trend.ml_prediction === 'LOW' ? '📉 LOW POTENTIAL' : 
 'Prediction unavailable'}
```
**Result**: ✅ Displays "📉 LOW POTENTIAL" (CORRECT)

---

### Step 2: User Clicks "Analyze with AI" Button
**User Action**: Click "Analyze with AI" in TrendDetail.jsx  
**Navigation**: Router navigates to `/ai/:id` (AIWorkspace component)  
**Verification**: [AIWorkspace.jsx](frontend/src/pages/AIWorkspace.jsx) Line 11 confirms route parameter  

---

### Step 3: AIWorkspace Loads Initial Data
**Trigger**: `useEffect()` at [AIWorkspace.jsx](frontend/src/pages/AIWorkspace.jsx) line 44  
**Function Called**: `loadWorkspace()` (line 20-40)  

**Sub-step 3a**: First API call  
```javascript
// Line 28: Get trend detail
const detail = await api.get(`/feed/${id}`);
setTrend(detail.data || null);
```
**Endpoint**: `GET /feed/:id`  
**Handler**: [feedController.js](backend/controllers/feedController.js) `getTrendDetail()` (line 151-210)  
**Response Contains**:
```javascript
{
  id: trend._id,
  score: 67,
  ml_prediction: "LOW",  // ← STRING format correct here
  // ... other fields
}
```
**State Update**: `trend` state now contains `ml_prediction: "LOW"` (string) ✓

---

### Step 4: AIWorkspace Triggers AI Analysis
**Sub-step 4b**: Second API call  
```javascript
// Line 32: Analyze and get AI insights
const { data } = await api.post(`/feed/${id}/analyze`);
setTrend((prev) => ({ ...(prev || {}), ...(data.trend || {}) }));
```
**Endpoint**: `POST /feed/:id/analyze`  
**Handler**: [feedController.js](backend/controllers/feedController.js) `analyzeTrend()` (line 227-369)  

---

### Step 5: Backend Analyze Endpoint Execution

**Execution Path** (for new analysis, non-cached):

**5.1: Check stored analysis** (Line 241-242)
```javascript
const hasStoredAnalysis = Boolean(
  typeof trend.analysis === 'string' && trend.analysis.trim() &&
  typeof trend.idea === 'string' && trend.idea.trim()
);
```
→ For new trend: FALSE (no stored analysis yet)  
→ Skip stored analysis path, continue to line 283

**5.2: Check AI quota** (Line 283-300)
```javascript
if (req.user && typeof req.user.aiRemaining === 'number' && req.user.aiRemaining <= 0) {
  // Quota check
}
```
→ Assume user has quota, continue

**5.3: Generate new analysis** (Line 307)
```javascript
let analysis;
try {
  analysis = await generateTrendAnalysis(trend);
} catch (error) {
  // Handle error
}
```
→ Calls OpenRouter API (or fallback) to generate analysis

**5.4: Predict trend potential** (Line 312)
```javascript
const mlPrediction = await predictTrend(trend);
```

This is the critical line that calls [mlService.js](backend/services/mlService.js) `predictTrend()`

---

### Step 6: ML Prediction Logic

**File**: [services/mlService.js](backend/services/mlService.js) Lines 15-30

```javascript
const predictTrend = async (trend) => {
  if (!trend || typeof trend.score !== 'number' || isNaN(trend.score)) {
    return {
      classification: 'UNAVAILABLE',
      confidence: 0.0,
      reasoning: ['Invalid trend data'],
      explanation: 'Cannot predict: missing or invalid score field'
    };
  }

  // Use the classifier to predict potential
  const prediction = classifyTrendPotential(trend);
  
  return prediction;
};
```

**Input**: `trend` object with `score: 67`  
**Validation**: `typeof 67 === 'number'` ✓ and `!isNaN(67)` ✓ → Continue  
**Function Call**: Calls [services/potentialClassifier.js](backend/services/potentialClassifier.js) `classifyTrendPotential(trend)`

---

### Step 7: Classification Logic

**File**: [services/potentialClassifier.js](backend/services/potentialClassifier.js) Lines 21-64

```javascript
function classifyTrendPotential(trend) {
  // Validation
  if (!trend || typeof trend.score !== 'number' || isNaN(trend.score)) {
    return {
      classification: 'UNAVAILABLE',
      confidence: 0.0,
      reasoning: ['No valid score data'],
      explanation: 'Cannot classify: missing or invalid score field'
    };
  }

  const score = trend.score;  // score = 67
  let classification;
  let confidence;
  const reasoning = [];

  // Base classification from score thresholds (line 36-44)
  if (score >= 70) {
    classification = 'HIGH';
    confidence = 0.85;
    reasoning.push(`Score ${score} is >= 70 threshold`);
  } else {
    classification = 'LOW';         // ← EXECUTES FOR score=67
    confidence = 0.70;
    reasoning.push(`Score ${score} is < 70 threshold`);
  }

  // Build explanation (line 47-57)
  const explanations = [];
  
  if (classification === 'HIGH') {
    // ... skip
  } else {
    explanations.push('This trend shows limited potential');
    explanations.push(`Score of ${score} indicates lower interest`);
    explanations.push('May gain traction with continued monitoring');
  }

  return {
    classification,                           // 'LOW'
    confidence: Number(confidence.toFixed(2)), // 0.70
    reasoning,                                // ["Score 67 is < 70 threshold"]
    explanation: explanations.join(' | ')     // Full explanation text
  };
}
```

**Execution for score=67**:
1. Validation passes ✓
2. `score = 67`
3. `67 < 70` → TRUE
4. `classification = 'LOW'`
5. `confidence = 0.70`
6. `reasoning = ["Score 67 is < 70 threshold"]`
7. Returns object:
```javascript
{
  classification: 'LOW',
  confidence: 0.70,
  reasoning: ["Score 67 is < 70 threshold"],
  explanation: "This trend shows limited potential | Score of 67 indicates lower interest | May gain traction with continued monitoring"
}
```

---

### Step 8: Backend Returns Response (THE BUG)

**File**: [controllers/feedController.js](backend/controllers/feedController.js) Lines 313-360

**Line 313**: mlPrediction now contains:
```javascript
{
  classification: 'LOW',
  confidence: 0.70,
  reasoning: [...],
  explanation: '...'
}
```

**Lines 316-340**: Store in database
```javascript
await Trend.findByIdAndUpdate(
  trend._id,
  {
    $set: {
      analysis: persistedAnalysis,
      idea: persistedIdea,
      ml_prediction: mlPrediction,  // ← STORES ENTIRE OBJECT
      updatedAt: new Date()
    }
  },
  { new: true }
).lean().catch(() => null);
```

**Lines 346-360**: Send API response
```javascript
res.status(200).json({
  trend: {
    id: trend._id,
    title: trend.title,
    source: trend.source,
    category: trend.category,
    score: trend.score || 0,
    scoreDetails: trend.scoreDetails || {},
    analysis: persistedAnalysis,
    idea: persistedIdea,
    link: trend.link || '',
    image: trend.image || '',
    thumbnail: trend.thumbnail || '',
    mediaType: trend.mediaType || 'none',
    ml_prediction: mlPrediction  // ← RETURNS ENTIRE OBJECT instead of STRING
  },
  analysis: {
    ...analysis,
    status: analysis?.status || 'fallback'
  },
  aiRemaining: req.user?.aiRemaining ?? 0
});
```

**Frontend Receives** (From API response):
```javascript
{
  trend: {
    id: "...",
    title: "...",
    score: 67,
    ml_prediction: {                  // ← OBJECT, not STRING!
      classification: 'LOW',
      confidence: 0.70,
      reasoning: ["Score 67 is < 70 threshold"],
      explanation: '...'
    },
    // ... other fields
  },
  analysis: {...}
}
```

---

### Step 9: Frontend State Update

**File**: [AIWorkspace.jsx](frontend/src/pages/AIWorkspace.jsx) Line 34

```javascript
setTrend((prev) => ({ ...(prev || {}), ...(data.trend || {}) }));
```

**State Update**: Merges `data.trend` into existing `trend` state  
**Result**: `trend.ml_prediction` is now an **OBJECT**, not a string

---

### Step 10: Frontend Rendering (WHERE "PREDICTION UNAVAILABLE" SHOWS)

**File**: [AIWorkspace.jsx](frontend/src/pages/AIWorkspace.jsx) Line 195

```jsx
<div className="summary-row">
  <span className="summary-label">Momentum</span>
  {trend?.ml_prediction ? (
    <span className="signal-pill" style={getPredictionBadgeStyle(trend.ml_prediction)}>
      {trend.ml_prediction === 'HIGH' ? '🔥 HIGH POTENTIAL' : 
       trend.ml_prediction === 'LOW' ? '📉 LOW POTENTIAL' : 
       'Prediction unavailable'}
    </span>
  ) : trend?.source === 'Google Trends' ? (
    <strong>Prédiction ML indisponible pour cette source.</strong>
  ) : (
    <strong>—</strong>
  )}
</div>
```

**Execution**:
1. `trend?.ml_prediction` exists (truthy) → First condition TRUE
2. `trend.ml_prediction === 'HIGH'` → FALSE (object ≠ string)
3. `trend.ml_prediction === 'LOW'` → FALSE (object ≠ string)
4. Ternary falls through to: `'Prediction unavailable'`
5. **Display**: "Prediction unavailable" ✗

---

### Step 11: Same Bug in TrendDetail

**File**: [TrendDetail.jsx](frontend/src/pages/TrendDetail.jsx) Line 176

Same rendering logic, but TrendDetail gets trend from `GET /feed/:id` endpoint which **correctly** returns `ml_prediction` as a STRING ('LOW').

Result: TrendDetail correctly displays "📉 LOW POTENTIAL"

---

## SECTION 2: ROOT CAUSE ANALYSIS

### The Inconsistency

| Endpoint | File | Line | ml_prediction Type | Issue |
|----------|------|------|-------------------|-------|
| GET /feed (initial feed list) | trendController.js | 67 | STRING | ✓ Correct |
| GET /feed/:id (trend detail) | feedController.js | 207 | STRING | ✓ Correct |
| POST /feed/:id/analyze | feedController.js | 334 | OBJECT | ✗ **BUG** |

### Why It's a Bug

1. **trendController.js line 67** correctly extracts the classification:
```javascript
ml_prediction: mlPrediction.classification  // ← Just the string
```

2. **feedController.js line 334** incorrectly returns the whole object:
```javascript
ml_prediction: mlPrediction  // ← Entire object
```

3. **Frontend expects a STRING** for comparison:
```javascript
trend.ml_prediction === 'LOW'  // ← Expects string
```

4. **Result**: Object ≠ String → Falls through to "Prediction unavailable"

---

## SECTION 3: EXACT CODE LOCATIONS

### Bug Locations (3 instances in feedController.js)

**Instance 1**: Line 274 (Stored Analysis Path)
```javascript
res.status(200).json({
  trend: {
    ...
    ml_prediction: mlPrediction  // ← BUG: Should be mlPrediction.classification
  },
```

**Instance 2**: Line 334 (New Analysis Path - MAIN BUG)
```javascript
res.status(200).json({
  trend: {
    ...
    ml_prediction: mlPrediction  // ← BUG: Should be mlPrediction.classification
  },
```

**Instance 3**: Line 360 (Error Path)
```javascript
res.status(200).json({
  trend: {
    ...
    ml_prediction: mlPrediction  // ← BUG: Should be mlPrediction.classification
  },
```

### Correct Implementation (Reference)

**trendController.js Line 67**:
```javascript
ml_prediction: mlPrediction.classification,  // ← CORRECT: Extract the string
```

---

## SECTION 4: PAYLOAD COMPARISON

### What Frontend RECEIVES from POST /feed/:id/analyze (WRONG)

```json
{
  "trend": {
    "id": "507f1f77bcf86cd799439011",
    "score": 67,
    "ml_prediction": {
      "classification": "LOW",
      "confidence": 0.70,
      "reasoning": ["Score 67 is < 70 threshold"],
      "explanation": "This trend shows limited potential..."
    }
  }
}
```

### What Frontend SHOULD RECEIVE (CORRECT)

```json
{
  "trend": {
    "id": "507f1f77bcf86cd799439011",
    "score": 67,
    "ml_prediction": "LOW"
  }
}
```

---

## SECTION 5: EXECUTION SUMMARY

| Step | Component | Action | ml_prediction Type | Status |
|------|-----------|--------|-------------------|--------|
| 1 | User/Feed | Click trend (score=67) | - | Init |
| 2 | TrendDetail | Display trend detail | STRING 'LOW' | ✅ Works |
| 3 | User/TrendDetail | Click "Analyze with AI" | - | Navigation |
| 4 | AIWorkspace | Load initial data | STRING 'LOW' | ✅ Works |
| 5 | AIWorkspace | POST /feed/:id/analyze | OBJECT {...} | ❌ BUG |
| 6 | AIWorkspace | Render momentum section | OBJECT !== STRING | ❌ Shows "unavailable" |

---

## CONCLUSION

**Finding**: The `/feed/:id/analyze` endpoint returns `ml_prediction` as a **PREDICTION OBJECT** instead of a **STRING**, causing the frontend rendering logic to fail.

**Impact**: Users see "Prediction unavailable" in AIWorkspace.jsx even when the ML model correctly predicts LOW/HIGH potential.

**Severity**: 🔴 **HIGH** - Breaks core AI feature visibility

**Fix Complexity**: 🟢 **LOW** - 1-line changes in 3 locations

**Files Affected**:
- [backend/controllers/feedController.js](backend/controllers/feedController.js) (3 lines to fix)
- No frontend changes needed

**Root Cause**: Copy-paste from predictTrend() which returns full object; forgot to extract `.classification` like trendController.js correctly does.
