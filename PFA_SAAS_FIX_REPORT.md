# PFA/SaaS Fix Report

## Scope

Fixes were applied from `Rapport.md` with one explicit exception: `ml-model/` was not integrated into the runtime backend. It remains an experimental PFA artifact because current Reddit collection no longer provides stable engagement features such as comment counts for reliable live prediction.

## Fixes Applied

### Credibility and fake-news risk

- Added `backend/services/credibilityService.js`.
- Added conservative credibility fields to `backend/models/Trend.js`.
- Integrated credibility calculation during `saveTrends()` in `backend/services/trendService.js`.
- Exposed credibility metadata in feed, search, and trend detail responses.
- Added backend tests in `backend/test/credibilityService.test.js`.

Runtime behavior:

- A trend is marked `verified` only when a trusted editorial/domain source is present.
- Reddit/community trends without direct evidence remain `unverified`.
- Risky titles can be marked `unverifiable` and `isFakeNews: true` only when risk markers exist without trusted evidence.

### MongoDB performance

- Added schema indexes for score sorting, freshness sorting, category filtering, source filtering, credibility filtering, and text search fields.
- Kept `autoIndex: false`, so production index creation stays controlled.

### Search reliability

- Expanded search query fields from `title`, `tags`, `category` to `title`, `tags`, `category`, `excerpt`, and `link`.
- Updated backend search tests accordingly.

### Security

- `GET /api/users/profile` no longer returns the raw Mongoose user object.
- Save/unsave trend endpoints now validate ObjectId input.
- Save/unsave trend operations are atomic and avoid duplicate increments or negative decrements.

### AI reliability

- Groq calls now fail early with clean `ai_unavailable` behavior if `GROQ_API_KEY` is missing.
- Trend analysis requests ask Groq for a JSON object response.
- No local AI fallback report was reintroduced.

### Frontend quality

- Fixed ESLint errors in `SearchPage.jsx`, `AIWorkspace.jsx`, and `media.js`.
- Removed duplicate initial feed fetch in `Feed.jsx`.
- `npm run lint` now passes.

### Repository and config cleanup

- Removed the generated `artifacts/` directory.
- Added `artifacts/` to `.gitignore`.
- Added `.env.example`.
- Updated `docker-compose.yml` from OpenRouter config to Groq config.
- Replaced broken root scripts with working root scripts.
- Rebuilt `AGENTS.md` with current runtime instructions and ML clarification.

## Validation

```text
npm test
PASS - backend tests: 16/16

npm run lint
PASS - frontend ESLint

npm run build
PASS - frontend production build
Warning only: Vite chunk size > 500 kB

Backend startup
PASS on PORT=5055
Note: default PORT=3000 was already in use locally.
```

## Remaining Risks

- `ml-model/` is not production runtime. It should be presented as experimental, not as the active prediction engine.
- Reddit RSS can still return 429 when OAuth credentials are missing.
- Frontend bundle is large; code splitting remains a future improvement.
- Credibility is conservative and evidence-based, but it is not a full external fact-checking system.

## Updated Readiness Estimate

- PFA readiness: 82/100
- SaaS readiness: 58/100

The project is now cleaner and safer for soutenance, but still should not be presented as a production-grade SaaS or full fact-checking platform.
