# Reddit Prediction Runtime Audit

## Summary

A runtime audit confirmed that Reddit trends were being stored and surfaced with invalid prediction values, causing the frontend to show `Prediction unavailable` even when a valid trend score existed.

## Root cause

- Backend persisted `Trend.ml_prediction` values such as `UNKNOWN` and legacy numeric codes like `1`.
- The React frontend treats only `HIGH` and `LOW` as valid prediction badges.
- This mismatch caused legitimate Reddit trends to render as unavailable.

## Investigation

1. Checked backend prediction normalization in:
   - `backend/controllers/feedController.js`
   - `backend/services/trendService.js`
   - `backend/services/mlService.js`
2. Confirmed the runtime MongoDB state using a direct query against `Trend` documents with `source: /reddit/i`.
3. Found current stored Reddit prediction counts:
   - `UNAVAILABLE`: 915
   - `LOW`: 618
   - `HIGH`: 14

## Fix applied

- Normalized prediction values to the contract set: `HIGH`, `LOW`, `UNAVAILABLE`.
- Added legacy mapping for numeric prediction values:
  - `'1'` → `HIGH`
  - `'0'` → `LOW`
- Updated `Trend` schema default:
  - `ml_prediction` default changed from `UNKNOWN` to `UNAVAILABLE`
- Ensured `refreshRedditPrediction()` persists normalized values and no longer stores raw invalid predictions.

## Files changed

- `backend/controllers/feedController.js`
- `backend/services/trendService.js`
- `backend/services/mlService.js`
- `backend/models/Trend.js`

## Validation

- Ran backend test suite successfully:
  - `cd backend && npm test`
  - Result: `7 passed`
- Normalized existing Reddit database values with a migration script.
- Re-queried runtime DB and confirmed stored values now only include `UNAVAILABLE`, `LOW`, and `HIGH` for Reddit trends.

## Conclusion

The issue is a real backend/data mismatch, not a frontend rendering bug. The frontend behavior is correct for any value outside `HIGH`/`LOW`; the backend fix ensures stored Reddit predictions now conform to the expected API contract.
