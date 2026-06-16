# Code Cleanup Audit

## Summary

This audit is non-invasive: no source files were modified. Findings are limited to production backend/frontend source code and do not treat audit/migration scripts as defects unless they affect runtime or production quality.

## High-priority cleanup findings

1. `frontend/src/pages/Feed.jsx`
   - Issue: `displayCategoryLabel` is defined but never used.
   - Location: line 87.
   - Severity: low.
   - Recommendation: remove the unused function or reintroduce category label rendering if needed.

2. `frontend/src/pages/AIWorkspace.jsx`
   - Issue: runtime debug logging remains in production UI.
   - Location: lines 56-58.
   - Severity: medium.
   - Recommendation: remove `console.log('analysis', analysis)`, `console.log('trend', trend)`, and `console.log('ML_PREDICTION_RAW =', trend?.ml_prediction)` before production deployment.

## Frontend verification

- `npm run lint` in `frontend` reported exactly one lint error:
  - `frontend/src/pages/Feed.jsx:87:10` — `'displayCategoryLabel' is defined but never used.`
- `npm run build` in `frontend` previously succeeded, so the current frontend code compiles successfully.

## Backend cleanup observations

The backend contains several areas where cleanup would improve maintainability, but no critical production-blocking issues were detected in the source itself.

### Duplicate prediction normalization logic

- `backend/controllers/feedController.js`
  - Contains `normalizePredictionValue`, `safePredictionValue`, `shouldRefreshRedditPrediction`, and `refreshRedditPrediction` helper functions.
  - This duplicates similar prediction normalization logic already present in `backend/services/trendService.js` and `backend/services/mlService.js`.
  - Recommendation: consolidate prediction normalization and safe-value resolution into a single shared utility to reduce duplicate behavior and centralize ML prediction semantics.

- `backend/services/trendService.js`
  - Contains `normalizeMlPrediction`, `safeMlPredictionValue`, and prediction fallback logic.
  - Recommendation: align this module with the shared ML prediction utilities in `backend/services/mlService.js` or move normalization entirely into `mlService.js`.

### Source-specific prediction logic

- `backend/controllers/feedController.js`
  - `refreshRedditPrediction` only refreshes ML prediction for Reddit trends, while `backend/services/trendService.js` already includes a broader prediction generation path.
  - Recommendation: standardize prediction refresh behavior across feed generation and trend persistence to avoid source-specific drift.

### Local dynamic requires in `backend/controllers/userController.js`

- `Trend` is required inside `saveTrend`, `unsaveTrend`, and `getSavedTrends` instead of at module top-level.
- Recommendation: move `const Trend = require('../models/Trend')` to the top of the file for consistency and slightly cleaner dependency loading.

## Audit and migration scripts

The repository contains many scripts with intentional `console.log` output for reporting and verification. These are not treated as backend cleanup defects for this audit unless they are part of production runtime code.

Notable script file patterns:
- `backend/scripts/data_quality_audit.js`
- `backend/scripts/data_quality_migration.js`
- `backend/scripts/detailed_prediction_analysis.js`
- `backend/scripts/end_to_end_production_audit.js`
- `backend/scripts/prod_audit.js`
- `backend/scripts/score_audit_pre_deployment.js`
- `backend/scripts/test_ai_quota_reset.js`
- `backend/temp_reddit_json_ml_test.js`

These are audit/test artifacts and may intentionally log diagnostics.

## Large source file candidates

The following source files are the largest production candidates and may benefit most from a focused cleanup or refactor pass:

- `backend/scripts/end_to_end_production_audit.js` — 31.2 KB
- `backend/services/trendService.js` — 25.3 KB
- `backend/services/data/mediaExtractor.js` — 22.7 KB
- `frontend/src/pages/Feed.jsx` — 21.6 KB
- `backend/controllers/feedController.js` — 14.5 KB
- `frontend/src/pages/TrendDetail.jsx` — 13.6 KB
- `frontend/src/pages/AIWorkspace.jsx` — 11.8 KB

## TODO / FIXME / debugger search results

- No `TODO` or `FIXME` markers were found in production backend or frontend source files during the grep audit.
- `console.log` remains present in production frontend code at `frontend/src/pages/AIWorkspace.jsx`.

## Recommendations

1. Clean the unused frontend function in `frontend/src/pages/Feed.jsx`.
2. Remove debug logging from `frontend/src/pages/AIWorkspace.jsx`.
3. Consider consolidating prediction normalization logic across backend modules:
   - `backend/controllers/feedController.js`
   - `backend/services/trendService.js`
   - `backend/services/mlService.js`
4. Review source-specific ML refresh behavior in `backend/controllers/feedController.js` for consistency.
5. Keep audit and migration script logging as-is unless a project decision is made to reduce verbosity.

## Notes

- This audit does not modify any code.
- The largest maintenance targets are the backend trend service and feed controller files, plus the large audit/test script files.
