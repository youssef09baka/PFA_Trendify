# Trendify - Agent Guide

## Quick Start

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Root commands are also available:

```bash
npm run dev:backend
npm run dev:frontend
npm test
npm run build
npm run lint
```

## Architecture

| Directory | Tech | Entry | Module system |
|-----------|------|-------|---------------|
| `backend/` | Node 20, Express 4, Mongoose 8 | `server.js` -> `app.js` | CommonJS |
| `frontend/` | React 19, Vite, Tailwind v4, React Router v7 | `src/main.jsx` -> `App.jsx` | ESM |
| `ml-model/` | Python 3.12, Flask, scikit-learn | `app.py` | Experimental artifact |

The backend starts background feed sync on boot through `backend/services/feedSync.js`.

## Backend Commands

- `npm run dev` - nodemon hot reload
- `npm start` - production server
- `npm test` - Node.js built-in test runner
- `node archive/scripts/<script>.js` - archived audit and utility scripts

## Frontend Commands

- `npm run dev` - Vite dev server
- `npm run build` - production build
- `npm run lint` - ESLint
- `npm run preview` - serve built app

## ML Model

`ml-model/` is intentionally not integrated into the runtime backend. It remains a PFA presentation artifact because the current Reddit collection no longer provides enough stable engagement features, such as comment counts, for reliable live prediction.

Runtime prediction uses `backend/services/mlService.js`, which wraps the internal score-based classifier in `potentialClassifier.js`.

## Docker

`docker-compose up` starts:

- MongoDB on port 27017
- backend on port 5000
- frontend preview on port 4173

The ML model has its own Dockerfile but is not part of `docker-compose.yml`.

## Environment

Use `.env.example` as the template.

Required backend variables:

```text
MONGO_URI=<mongodb-uri>
JWT_SECRET=<long-random-secret>
GROQ_API_KEY=<gsk_...>
```

Useful optional variables:

```text
GROQ_MODEL=llama-3.3-70b-versatile
SERPAPI_KEY=<serpapi-key>
FRONTEND_URL=http://localhost:4173
PORT=5000
REDDIT_CLIENT_ID=<optional>
REDDIT_CLIENT_SECRET=<optional>
REDDIT_DISABLED_SUBREDDITS=entertainment,cybersecurity,space
```

Never commit real `.env` values.

## Main API Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/users/signup` | No | Register |
| `POST /api/users/login` | No | Login |
| `PUT /api/users/preferences` | JWT | Update preferences |
| `GET /api/users/profile` | JWT | Current profile |
| `GET /api/users/saved-trends` | JWT | Saved trends |
| `GET /api/feed` | JWT | Personalized feed |
| `GET /api/feed/search` | JWT | Dedicated search |
| `GET /api/feed/:id` | JWT | Trend detail |
| `POST /api/feed/:id/analyze` | JWT | Fresh Groq analysis |
| `POST /api/feed/:id/save` | JWT | Save trend |
| `DELETE /api/feed/:id/save` | JWT | Unsave trend |
| `POST /api/assistant/chat` | JWT | Trendi assistant |

## Runtime Notes

- AI analysis depends exclusively on Groq.
- No local AI fallback report is generated.
- Trend analysis is generated on demand and is not persisted in MongoDB.
- Feed preferences use strict category filtering.
- Mongoose `autoIndex` is disabled; schema indexes document the expected production indexes.
- `artifacts/` is ignored and should not be committed.
