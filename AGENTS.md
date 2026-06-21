# AI Trend Predictor — Agent Guide

## Quick start

```bash
cd backend && npm install && npm run dev    # Express API (port 3000)
cd frontend && npm install && npm run dev   # Vite dev server (proxy /api -> :3000)
```

Root `package.json` references `start-dev.ps1` / `stop-dev.ps1` — those scripts **do not exist** (broken). Use individual `npm run dev` per package instead.

## Architecture — three packages in one repo

| Directory | Tech | Entry | Module system |
|-----------|------|-------|---------------|
| `backend/` | Node 20, Express 4, Mongoose 8 | `server.js` → `app.js` | **CommonJS** (`type: commonjs`) |
| `frontend/` | React 19, Vite, Tailwind v4, React Router v7 | `src/main.jsx` → `App.jsx` | **ESM** (`type: module`) |
| `ml-model/` | Python 3.12, Flask, scikit-learn | `app.py` (port 5001) | — |

**Backend starts a background feed sync on boot** (`services/feedSync.js`), plus media backfill/repair tasks. No need to trigger manually.

## Key commands

### Backend
- `npm run dev` — nodemon hot-reload on `server.js`
- `npm start` — production `node server.js`
- `npm test` — **Node.js built-in test runner**: `node --test test/*.js`
- `node archive/scripts/<script>.js` — archived backend utilities (21 scripts: AI provider comparison, data audits, scoring verification, etc.)

### Frontend
- `npm run dev` — Vite dev server
- `npm run build` — Vite production build
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run preview` — serve built app (used in Docker: port 4173)

### ML model
- `python app.py` — Flask server on port 5001
- `python train.py` — trains model on `data/Redit_data.csv`, saves to `models/trend_predictor.pkl`

### Docker
- `docker-compose up` — starts mongo (27017), backend (5000), frontend (4173)
- ML model has its own `Dockerfile` but is **not** in `docker-compose.yml`

## Env setup

Backend `.env` (required vars — no `.env.example` exists):
```
MONGO_URI=<mongodb+srv://...>
JWT_SECRET=<secret>
OPENROUTER_API_KEY=<sk-or-v1-...>
```

Optional: `GROQ_API_KEY`, `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ENGINE_ID`, `PORT` (default 5000, but dev `.env` overrides to 3000), `REDDIT_CLIENT_ID`/`SECRET`, etc.

**The committed `.env` contains real credentials** — avoid committing changes to it.

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/users/signup` | No | Register (rate limited: 30/15min) |
| `POST /api/users/login` | No | Login (rate limited) |
| `PUT /api/users/preferences` | JWT | Update user preferences |
| `GET /api/users/profile` | JWT | Get current user |
| `GET /api/users/saved-trends` | JWT | Saved trends |
| `GET /api/feed` | JWT | Personalized feed |
| `GET /api/feed/:id` | JWT | Trend detail |
| `POST /api/feed/:id/analyze` | JWT | AI analysis (consumes quota) |
| `POST /api/feed/:id/save` | JWT | Save trend |
| `DELETE /api/feed/:id/save` | JWT | Unsave trend |

Rate limits: general 600 req/15min, auth 30 req/15min.

## Testing quirks

- Tests use **Node.js `node:test`** (built-in, no Jest/Mocha). Run with `npm test` from `backend/`.
- Tests stub `require.cache` directly (no mocking library). They swap module exports in/out per scenario.
- 4 test files in `backend/test/`. All stub MongoDB + OpenRouter calls.
- No frontend tests exist.

## Notable conventions

- **AI analysis quota**: Each user has `aiRemaining` (default 1000, daily reset). Quota is reserved atomically via `findOneAndUpdate` before calling OpenRouter.
- **Trend caching**: Fetched trends cached in-memory for 10 min (`TREND_CACHE_DURATION_MS`).
- **ML prediction**: `backend/services/mlService.js` uses **internal score-based classifier** (`potentialClassifier.js`), not the Flask ML service. HIGH >= 70, LOW < 70.
- **Mongoose** `strictQuery: true`, `autoIndex: false` (production safety).
- **Vite dev server** proxies `/api` → `http://localhost:3000`.
- **No CI/CD** — no `.github/` workflows.

## JSON/API responses follow `{ success: bool, data/error: ... }` pattern.
