# Trendify - Complete Master Project Dossier

This document is a complete technical, functional and academic dossier for the Trendify project. It is designed so that another AI, a report writer, a presentation designer or an academic supervisor can understand the project without reading the source code.

---

## 1. Executive Summary

### Project Name

The final product name is **Trendify**.

The original academic project name was **AI Trend Predictor**, but the current application branding, interface and documentation use **Trendify**.

### Problem Addressed

Online trends appear and disappear very quickly. Relevant signals are spread across multiple platforms such as Reddit and Google Trends. A creator, entrepreneur, marketer or analyst has to manually inspect many sources to answer questions such as:

- What is currently gaining attention?
- Which topics have real potential?
- Which trend is useful for business or content creation?
- Which signal is only noise?
- Which topics match my interests?
- How can I transform a trend into a concrete opportunity?

The problem is not only collecting trends. The real difficulty is converting raw web signals into structured, ranked and actionable information.

### Proposed Solution

Trendify is a web platform that:

- collects trends from Reddit and Google Trends;
- cleans and validates raw trend data;
- removes duplicates;
- computes an opportunity score;
- stores trends in MongoDB;
- personalizes the feed according to user preferences;
- provides search across stored trends;
- allows users to save favorite trends;
- generates AI analysis reports on demand using Groq;
- provides a specialized assistant named Trendi;
- evaluates credibility signals for each trend.

### Main Objectives

The main objectives of the project are:

1. Build a complete full-stack trend detection platform.
2. Collect real trend signals from external sources.
3. Normalize heterogeneous data into one common trend model.
4. Rank trends using an explainable scoring system.
5. Personalize the user feed based on preferences.
6. Generate strategic AI analysis reports.
7. Provide a conversational assistant specialized in trends.
8. Keep the application demonstrable, secure and maintainable.

### Value Proposition

Trendify transforms raw trend signals into strategic insight.

Instead of showing a simple list of trending topics, the application provides:

- a personalized feed;
- score-based prioritization;
- source and category context;
- AI-generated reports;
- business opportunities;
- content ideas;
- saved trend tracking;
- voice-enabled assistant interaction.

### Target Users

The primary users are:

- content creators who need ideas based on current trends;
- entrepreneurs looking for market opportunities;
- marketers monitoring audience interest;
- startup teams exploring product ideas;
- students or analysts studying online trend behavior;
- decision-makers who need a quick view of emerging topics.

---

## 2. Team Structure

The project team is composed of three members.

### MAKHOUKH Youssef

Role:

- project lead;
- backend developer;
- AI integration contributor.

Main responsibilities:

- backend architecture;
- Express API implementation;
- JWT authentication;
- feed pipeline integration;
- AI analysis endpoint;
- Trendi assistant backend integration;
- performance audits and optimizations;
- repository cleanup and final validation.

### BOUHLAL Mouad

Role:

- data engineer.

Main responsibilities:

- Reddit collection logic;
- Google Trends collection logic;
- data cleaning and validation;
- trend scoring pipeline;
- source auditing;
- data quality verification.

### BENKELTOUM Abdessalam

Role:

- frontend developer.

Main responsibilities:

- React interface;
- navigation and user experience;
- landing page;
- feed UI;
- search UI;
- profile/preferences UI;
- favorites page;
- AI report UI;
- frontend/backend integration.

---

## 3. Functional Analysis

### 3.1 Authentication

Authentication is implemented in the backend through:

- `backend/controllers/userController.js`
- `backend/routes/userRoutes.js`
- `backend/middleware/authMiddleware.js`
- `backend/models/User.js`

Frontend authentication is managed through:

- `frontend/src/context/AuthContext.jsx`
- `frontend/src/api/axios.js`
- `frontend/src/components/PrivateRoute.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Signup.jsx`

Functional behavior:

1. A user creates an account with name, email and password.
2. The backend validates the input.
3. The password is hashed with bcrypt.
4. The user is stored in MongoDB.
5. During login, the backend verifies the email and password.
6. A JWT token is generated and sent to the frontend.
7. The frontend stores the token in `localStorage`.
8. Axios automatically attaches the token to protected API requests.
9. If a 401 response is received, the frontend removes the token and redirects to login.

Input validation:

- name must be 2 to 50 characters;
- email must match a standard email pattern;
- password must be between 8 and 128 characters.

### 3.2 Feed

The feed is the main trend discovery experience.

Backend route:

- `GET /api/feed`

Frontend page:

- `frontend/src/pages/Feed.jsx`

Backend process:

1. The authenticated user is read from `req.user`.
2. User preferences are mapped to allowed categories.
3. MongoDB is queried through `getFeedTrends()`.
4. If stored trends exist and refresh is not forced, the stored feed is returned.
5. If no stored trends are available or refresh is forced, the backend calls `getRealTrends()`.
6. Trends are scored using `scoreTrends()`.
7. Trends are persisted using `saveTrends()`.
8. The response includes items, pagination metadata and AI quota information.

Frontend behavior:

- first page loads on page open;
- page size is 24 trends;
- additional pages load through IntersectionObserver or a visible "Charger plus" button;
- no automatic fallback timer silently loads pages;
- users can filter by visible categories;
- users can sort by recent or score;
- users can save trends;
- saved trends can be opened in a drawer.

### 3.3 Search

Search is separated from the feed.

Backend route:

- `GET /api/feed/search?q=<query>&limit=<limit>`

Frontend page:

- `frontend/src/pages/SearchPage.jsx`

Search fields:

- `title`;
- `tags`;
- `category`;
- `excerpt`;
- `link`.

Search behavior:

1. The user types a query on the dedicated search page.
2. The frontend debounces the query by 250 ms.
3. The backend builds a MongoDB regex query.
4. Up to 500 candidate trends are scanned.
5. Results are ranked by search relevance before score.
6. The frontend displays modern result cards.
7. Recent searches are stored locally in `localStorage` under `trendify_recent_searches`.

Relevance scoring:

- exact title match receives the highest relevance;
- title contains query receives strong relevance;
- tags and category matches receive medium relevance;
- excerpt and link matches receive additional relevance;
- individual words also contribute smaller relevance points.

### 3.4 Favorites

Favorites allow users to save trends.

Backend routes:

- `POST /api/feed/:id/save`
- `DELETE /api/feed/:id/save`
- `GET /api/users/saved-trends`

Frontend pages/components:

- `frontend/src/pages/Favorites.jsx`
- saved drawer in `frontend/src/pages/Feed.jsx`

Backend behavior:

- `saveTrend()` validates the trend ObjectId;
- checks if the trend exists;
- uses `$addToSet` to avoid duplicate saves;
- increments `savedCount`;
- `unsaveTrend()` uses `$pull`;
- decrements `savedCount` only when above zero;
- saved trends are returned in the same order as user saved IDs.

### 3.5 User Preferences

Preferences are stored in the `User` model as an array of strings.

Supported preference IDs:

- `tech`
- `gaming`
- `business`
- `education`
- `health`
- `society`
- `startup`
- `creator`

Backend route:

- `PUT /api/users/preferences`

Frontend page:

- `frontend/src/pages/Profile.jsx`

Legacy route:

- `/preferences` redirects to `/profile`.

Preference mapping in backend:

```js
tech -> Tech
gaming -> Gaming
business -> Business
education -> Science
health -> Science
society -> Social, Discussion
startup -> Startups
creator -> Social, Entertainment, Web Culture
```

Current personalization behavior:

- preferences are used as strict category filters;
- the original trend score is not modified;
- no `personalizedScore` is returned;
- no reranking bonus is applied;
- if no preference is available, the normal feed is returned.

### 3.6 AI Analysis

AI analysis generates a strategic report for one trend.

Backend route:

- `POST /api/feed/:id/analyze`

Backend service:

- `backend/services/aiService.js`

Frontend page:

- `frontend/src/pages/AIWorkspace.jsx`

Behavior:

1. User opens `/ai/:id`.
2. Frontend loads trend details.
3. Frontend calls `POST /api/feed/:id/analyze`.
4. Backend validates the ObjectId.
5. Backend retrieves the trend.
6. Backend atomically reserves one AI quota credit.
7. Backend calls Groq.
8. If Groq succeeds, the analysis is returned.
9. If Groq fails, quota is refunded.
10. No analysis is stored in MongoDB.

AI report sections:

- summary;
- why it matters;
- why the trend rises;
- target audience;
- market analysis;
- opportunity;
- risks;
- confidence;
- confidence reason;
- recommendations;
- business opportunities;
- content ideas;
- conclusion.

Frontend loading experience:

- animated thinking loader;
- rotating analysis messages;
- progress bar capped before completion;
- minimum loading display of 5500 ms;
- report appears after the completion state.

### 3.7 Trendi Assistant

Trendi is the embedded assistant.

Backend route:

- `POST /api/assistant/chat`

Backend service:

- `backend/services/assistantService.js`

Frontend component:

- `frontend/src/components/AssistantWidget.jsx`

Behavior:

1. User asks a question.
2. Frontend sends the message to `/api/assistant/chat`.
3. Backend sanitizes the message.
4. Backend extracts topic terms.
5. Backend queries MongoDB for relevant trends.
6. Backend builds a context from trend title, source, category, score and tags.
7. Groq generates a response.
8. The response is sanitized to remove technical terms.
9. Frontend displays the answer.

Assistant capabilities:

- answer general trend questions;
- recommend the most promising trend;
- provide business ideas;
- provide content ideas;
- answer topic-specific questions such as "GTA 6";
- reject unrelated high-score trends if a specific topic was requested;
- voice input via SpeechRecognition;
- voice output via browser SpeechSynthesis.

### 3.8 Credibility System

Credibility is calculated during trend persistence.

Backend service:

- `backend/services/credibilityService.js`

Stored fields:

- `credibilityScore`
- `credibilityConfidence`
- `verificationStatus`
- `verifiedSources`
- `credibilityExplanation`
- `isFakeNews`
- `credibilitySignals`

It is not a full fact-checking system. It is a conservative evidence layer that prevents unsupported content from being marked as verified.

### 3.9 Trend Collection

Trend collection is handled by:

- `backend/services/data/index.js`
- `backend/services/data/redditService.js`
- `backend/services/data/redditApi.js`
- `backend/services/data/redditRss.js`
- `backend/services/data/googleTrendsService.js`

Sources:

- Reddit RSS or Reddit OAuth API;
- Google Trends through SerpAPI.

### 3.10 Trend Scoring

Trend scoring is implemented in:

- `backend/services/trendService.js`

The score is calculated from:

- popularity;
- growth;
- engagement;
- sentiment;
- recency;
- source confidence;
- uniqueness factor;
- category/source diversity.

The output score is clamped between 35 and 95.

---

## 4. Technical Architecture

### 4.1 High-Level Architecture

```text
User Browser
    |
    | React SPA
    v
Frontend / Vite
    |
    | Axios / REST / JWT
    v
Backend Express API
    |
    | Mongoose
    v
MongoDB Atlas

External Services:
    - Reddit RSS / Reddit OAuth API
    - SerpAPI Google Trends
    - Groq Chat Completions API
```

### 4.2 Backend Architecture

```text
server.js
    |
    v
app.js
    |
    |-- middleware
    |   |-- helmet
    |   |-- cors
    |   |-- rate limit
    |   |-- mongo sanitize
    |   |-- request logger
    |   |-- auth middleware
    |   |-- error handler
    |
    |-- routes
    |   |-- userRoutes
    |   |-- feedRoutes
    |   `-- assistantRoutes
    |
    |-- controllers
    |   |-- userController
    |   |-- feedController
    |   `-- assistantController
    |
    |-- services
    |   |-- data collection
    |   |-- trend scoring
    |   |-- credibility
    |   |-- AI analysis
    |   |-- assistant
    |   |-- feed sync
    |   `-- internal potential classifier
    |
    `-- models
        |-- User
        `-- Trend
```

### 4.3 Frontend Architecture

```text
main.jsx
    |
    v
App.jsx
    |
    |-- ThemeProvider
    |-- AuthProvider
    |-- BrowserRouter
    |-- PrivateRoute
    |-- Ambient3DBackground
    |-- AssistantWidget
    |
    `-- pages
        |-- LandingPage
        |-- Login
        |-- Signup
        |-- Home
        |-- Feed
        |-- SearchPage
        |-- Favorites
        |-- Profile
        |-- TrendDetail
        `-- AIWorkspace
```

### 4.4 Data Flow Diagram

```text
Reddit / Google Trends
        |
        v
getRealTrends()
        |
        |-- source fetch
        |-- validation
        |-- cache
        |-- interleaving
        |-- deduplication
        v
scoreTrends()
        |
        v
saveTrends()
        |
        |-- normalize media
        |-- compute slug
        |-- generate features
        |-- classify potential
        |-- evaluate credibility
        |-- upsert MongoDB
        v
MongoDB Trend collection
        |
        v
GET /api/feed
        |
        v
React Feed / Search / Detail / AI Report
```

### 4.5 AI Data Flow

```text
User clicks "Ouvrir le rapport"
        |
        v
Frontend POST /api/feed/:id/analyze
        |
        v
Backend retrieves trend
        |
        v
Atomic quota reservation
        |
        v
Groq API call
        |
        v
JSON validation and normalization
        |
        v
Response returned to frontend
        |
        v
AI report rendered
```

### 4.6 Trendi Data Flow

```text
User message
    |
    v
AssistantWidget
    |
    v
POST /api/assistant/chat
    |
    v
extractTopicTerms()
    |
    v
MongoDB trend query
    |
    v
rankRelevantTrends()
    |
    v
Groq prompt with trend context
    |
    v
Sanitized French strategic answer
```

---

## 5. Technology Stack

### React

React is used to build the frontend single-page application.

Reasons:

- component-based architecture;
- good fit for interactive UI;
- easy state management with hooks and contexts;
- efficient integration with React Router;
- suitable for modern product-like interfaces.

### Vite

Vite is used as the frontend development/build tool.

Reasons:

- fast local development;
- simple build pipeline;
- built-in proxy support;
- modern ESM-first development.

### Node.js

Node.js powers the backend runtime.

Reasons:

- good fit for API-driven applications;
- asynchronous I/O for external API calls;
- same language family as frontend;
- strong npm ecosystem.

### Express

Express is used to build REST APIs.

Reasons:

- minimal and flexible;
- easy routing and middleware composition;
- common choice for academic and professional Node APIs;
- simple integration with JWT, rate limiting and Mongoose.

### MongoDB and Mongoose

MongoDB stores users and trends.

Reasons:

- trend data has semi-structured fields;
- external sources provide heterogeneous metadata;
- flexible schema is useful for media, credibility and scoring details;
- Mongoose provides schema validation and query abstraction.

### JWT

JWT is used for stateless authentication.

Reasons:

- works well with SPA frontends;
- simple bearer token usage;
- avoids server-side session storage;
- easy middleware protection.

### Groq

Groq is used for AI analysis and Trendi responses.

Reasons:

- fast inference;
- OpenAI-compatible chat completions format;
- supports structured output request through JSON object mode;
- suitable for on-demand analysis generation.

### SerpAPI

SerpAPI is used to access Google Trends data.

Reasons:

- avoids scraping Google pages directly;
- provides structured trending search responses;
- easier to integrate with backend services.

### Reddit RSS / OAuth

Reddit is used as a community signal source.

Reasons:

- strong trend discovery value;
- subreddit categories help identify domains;
- post score and comments can approximate engagement;
- RSS fallback keeps collection possible without OAuth.

### Three.js

Three.js is used by the frontend background component.

Reasons:

- supports premium 3D visual background;
- improves perceived product quality;
- integrates with React through a custom component.

### Docker

Dockerfiles exist for backend, frontend and ML module.

Reasons:

- reproducible deployment;
- easier containerized demonstration;
- separation of frontend/backend environments.

---

## 6. Data Pipeline

### Important Files

Data pipeline files:

- `backend/services/data/index.js`
- `backend/services/data/redditService.js`
- `backend/services/data/redditApi.js`
- `backend/services/data/redditRss.js`
- `backend/services/data/googleTrendsService.js`
- `backend/services/data/cleaner.js`
- `backend/services/data/mediaExtractor.js`
- `backend/services/data/mediaUniqueness.js`
- `backend/services/trendService.js`
- `backend/services/feedSync.js`

### Reddit Collection

`redditSubreddits.js` defines the subreddit list:

- technology
- tech
- AI
- MachineLearning
- OpenAI
- programming
- webdev
- Entrepreneur
- startups
- business
- marketing
- investing
- finance
- economics
- CryptoCurrency
- datascience
- Futurology
- science
- gaming
- worldnews
- news
- gadgets
- nottheonion
- Showerthoughts
- dataisbeautiful
- entertainment
- FinancialIndependence
- philosophy
- cybersecurity
- robotics
- artificial
- softwareengineering
- productivity
- innovation
- biotech
- space
- climate
- politics

The runtime can exclude subreddits through `REDDIT_DISABLED_SUBREDDITS`. Default excluded subreddits are:

- entertainment
- cybersecurity
- space

Reason: previous runtime audits showed these sources caused long 429 delays.

Reddit collection flow:

1. `getRedditTrends()` builds the active subreddit list.
2. It loops over active subreddits.
3. For each subreddit it calls `fetchRedditPosts()`.
4. `fetchRedditPosts()` tries OAuth API if credentials are available.
5. If OAuth is missing or fails, RSS is used.
6. Posts are normalized into common trend objects.
7. Titles are cleaned.
8. unsafe or unusable content is filtered.
9. duplicate titles are removed.
10. media is extracted from Reddit metadata.
11. ML-like features are generated.
12. trends are sorted by a Reddit-specific score.

Reddit trend fields:

- title;
- popularity from post score;
- growth from comments;
- source = Reddit;
- link;
- image/video/thumbnail;
- media type;
- fetchedAt;
- raw post data;
- num_comments;
- post_length;
- hour;
- title_length;
- sentiment;
- tags;
- excerpt;
- source_detail.

### Google Trends Collection

Google Trends collection is implemented in `googleTrendsService.js`.

It calls:

```text
https://serpapi.com/search.json
engine=google_trends_trending_now
geo=US
api_key=SERPAPI_KEY
```

Timeout:

- 5000 ms.

Google trend fields:

- title;
- popularity from search volume;
- growth from delta value;
- source = Google Trends;
- link to Google Trends Explore;
- fetchedAt;
- searchVolume;
- deltaValue;
- sentiment;
- tags;
- excerpt.

### Cleaning Process

Implemented in `cleaner.js`.

`cleanTitle()`:

- removes bracketed text;
- removes non-alphanumeric characters;
- trims whitespace;
- collapses repeated spaces.

`isGoodContent()`:

- filters titles containing terms such as sexual, kill, murder, graphic, violence, suicide, terrorist.

`validateTrend()` requires:

- title string;
- popularity number;
- growth number;
- source string;
- link string.

`estimateSentimentScore()`:

- uses simple positive and negative keyword lists;
- returns a score between -1 and 1;
- is used for scoring and feature generation.

### Duplicate Removal

Duplicate removal appears in two places:

1. Source-level Reddit deduplication:
   - normalized title key;
   - avoids duplicate Reddit posts.

2. Cross-source deduplication in `data/index.js`:
   - normalized title key;
   - removes articles like "the", "a", "an";
   - interleaves sources while skipping duplicate keys.

### Source Interleaving

`interleaveSourceBuckets()` takes source buckets and alternates items from each source. This prevents one source from dominating the merged data.

Example:

```text
Google item 1
Reddit item 1
Google item 2
Reddit item 2
...
```

### Cache Logic

`getRealTrends()` uses memory cache:

- cache object contains `data` and `timestamp`;
- default cache duration is `TREND_CACHE_DURATION_MS`;
- default value is 10 minutes;
- if cache is valid, external APIs are not called.

### Scoring Process

`scoreTrends()` computes normalized scores.

Factors:

- popularityFactor;
- growthFactor;
- engagementFactor;
- sentimentFactor;
- recency;
- sourceConfidence;
- uniquenessFactor;
- categoryBalance;
- sourceBalance;
- momentumFactor.

Formula stored in `scoreDetails`:

```text
18 + 22*log(popularity) + 28*momentum + 10*recency + 10*sourceConfidence + 8*sentiment + 7*uniqueness
```

Score range:

- minimum 35;
- maximum 95.

### Persistence Process

`saveTrends()`:

1. receives scored trends;
2. processes trends in chunks of 100;
3. normalizes media;
4. normalizes source;
5. normalizes category;
6. builds slug;
7. computes media fingerprint;
8. generates feature fields for Reddit trends;
9. computes internal potential classification;
10. evaluates credibility;
11. upserts into MongoDB with `findOneAndUpdate({ slug })`;
12. uses `$setOnInsert` to initialize `savedCount`.

Slug format:

```text
<source>-<slugified-title>
```

### Background Feed Sync

Implemented in `feedSync.js`.

Behavior:

- starts when `server.js` starts;
- runs immediately;
- repeats every 60 minutes;
- uses a `running` flag to avoid overlapping sync runs;
- fetches real trends;
- scores trends;
- persists top trends;
- skips persistence if MongoDB is not connected;
- logs success or failure.

---

## 7. AI System

### AI Provider

The current AI provider is **Groq**.

Endpoint used:

```text
https://api.groq.com/openai/v1/chat/completions
```

Default model:

```text
llama-3.3-70b-versatile
```

Configurable through:

```text
GROQ_MODEL
```

Timeout:

- 15000 ms.

### Analysis Generation

Implemented in `aiService.js`.

The prompt asks the model to return a valid JSON object with exact keys:

- summary;
- whyItMatters;
- whyTrendRises;
- targetAudience;
- marketAnalysis;
- opportunity;
- risks;
- confidence;
- confidenceReason;
- recommendations;
- businessOpportunities;
- contentIdeas;
- conclusion.

Important prompt rules:

- response must be in French;
- each paragraph must be related to the exact trend topic;
- no generic filler;
- bad news must be classified as a threat;
- short-lived attention peaks must be described as temporary;
- uncertain subjects must be described as neutral or exploratory;
- business opportunities and content ideas must be specific;
- the model must avoid generic formats such as podcast, blog, newsletter unless justified.

The backend requests:

```js
response_format: { type: "json_object" }
temperature: 0.16
max_tokens: 1300
```

Normalization:

- strings are compacted;
- list fields are filtered and sliced;
- status is set to `groq`.

Validation:

- all core fields must exist;
- list fields must contain at least one item;
- if validation fails, the backend throws `ai_unavailable`.

### AI Error Handling

If Groq fails:

- no local report is generated;
- backend returns a clean `ai_unavailable` error;
- quota is refunded when already reserved;
- frontend shows a user-friendly unavailable message.

### Trendi Prompt Engineering

`assistantService.js` builds a specialized assistant prompt.

System role:

- Trendi is an expert assistant for Trendify;
- not a generic chatbot;
- not a search engine;
- responds like startup consultant, market analyst and strategic watcher;
- only uses provided trends;
- must stay on the user topic if one is detected;
- must not recommend unrelated trends even with higher scores;
- always responds in French.

Forbidden public terms:

- MongoDB;
- OpenRouter;
- Groq;
- API;
- backend;
- collection;
- database;
- internal sources;
- system;
- context;
- Google Trends score;
- raw score language.

English leak detection:

- blocks phrases such as "score of", "there is", "businesses", "potential", "trending", "opportunity", "recommendation".

Topic extraction:

- detects quoted topics;
- detects explicit topics after "sur", "concernant", "a propos de", "recherche", "cherche";
- detects domain topics such as IA, gaming, sante, sport, business, technologie.

Topic aliases:

- IA/AI/OpenAI/ChatGPT;
- gaming/game/GTA/PlayStation/Xbox/Nintendo/esport;
- health/sante/medical/wellness/fitness;
- sport/NBA/football/basket/tennis;
- business/finance/startup/market/revenue/stock;
- tech/software/cyber/data.

### AI Limitations

Technical limitations:

- depends on Groq availability;
- no local fallback;
- generated reports depend on available trend metadata;
- if trend title/tags are vague, analysis quality can be limited;
- assistant is context-bound to top MongoDB trends.

Product limitations:

- AI does not verify facts externally;
- AI does not browse real-time web during analysis;
- AI does not create persistent analysis history.

---

## 8. Credibility System

### Service

Implemented in:

- `backend/services/credibilityService.js`

### Trusted Sources

Trusted domains include:

- reuters.com;
- apnews.com;
- bbc.com;
- bbc.co.uk;
- theverge.com;
- techcrunch.com;
- wired.com;
- nature.com;
- nih.gov;
- who.int;
- sec.gov;
- nasa.gov;
- gamespot.com;
- ign.com;
- polygon.com.

### Source Baselines

Google Trends:

- base credibility score 68;
- confidence medium;
- status `partially_verified`;
- meaning: confirms search interest, not factual truth.

Reddit:

- base credibility score 46;
- confidence low;
- status `unverified`;
- meaning: useful community signal, not editorial proof.

Unknown source:

- base score 50;
- confidence low;
- status `unverified`.

### Risk Detection

High-risk patterns detect terms such as:

- fake;
- hoax;
- scam;
- fraud;
- conspiracy;
- deepfake;
- misinformation;
- rumor;
- leak;
- unverified;
- secret cure;
- guaranteed.

Sensational patterns detect terms such as:

- shocking;
- exposed;
- you won't believe;
- insane;
- destroyed;
- panic;
- collapse;
- multiple exclamation marks.

### Verification Status Logic

Status can be:

- `verified`;
- `partially_verified`;
- `unverified`;
- `unverifiable`;
- `disputed`.

Rules:

- trusted source without high-risk markers -> verified;
- trusted source with risk markers -> partially verified;
- high risk without trusted source -> unverifiable;
- Google Trends baseline -> partially verified;
- Reddit baseline -> unverified.

### Confidence Logic

Confidence can be:

- high;
- medium;
- low.

Rules:

- trusted source and no high-risk marker -> high;
- trusted source or medium baseline -> medium;
- otherwise -> low.

### Fake News Flag

`isFakeNews` is true only when:

- no trusted source exists;
- high-risk markers exist;
- credibility score is below 35.

This is intentionally conservative.

---

## 9. Machine Learning Module

### Location

The ML module is located in:

- `ml-model/`

Files:

- `app.py`
- `train.py`
- `predict.py`
- `requirements.txt`
- `Dockerfile`
- `data/Redit_data.csv`
- `data/trends_dataset.csv`

### Dataset

Primary dataset:

- `ml-model/data/Redit_data.csv`

Columns:

- title;
- upvotes;
- num_comments;
- created_utc;
- subreddit;
- post_type;
- post_length;
- viral;
- hour;
- day_of_week;
- title_length;
- sentiment.

Secondary dataset:

- `ml-model/data/trends_dataset.csv`

Columns:

- reddit_score;
- comments_count;
- google_trend_score;
- engagement_rate;
- growth_rate;
- sentiment_score;
- final_label.

### Features Used in Training

`train.py` uses:

- num_comments;
- post_length;
- hour;
- title_length;
- sentiment.

Target:

- viral.

### Training Process

Steps:

1. Load `data/Redit_data.csv`.
2. Print dataset shape.
3. Print class distribution.
4. Select feature columns.
5. Select target `viral`.
6. Split into train/test with stratification.
7. Train Logistic Regression baseline.
8. Train XGBoost classifier.
9. Train RandomForest pipeline with StandardScaler.
10. Use GridSearchCV over:
    - n_estimators: 50, 100, 200;
    - max_depth: None, 5, 10.
11. Evaluate accuracy.
12. Print classification report.
13. Print confusion matrix.
14. Save model to `models/trend_predictor.pkl`.
15. Print feature importance.

### Algorithms

Algorithms explored:

- Logistic Regression;
- XGBoost;
- Random Forest with GridSearchCV.

The saved model is the best RandomForest pipeline.

### Prediction API

`app.py` defines a Flask `/predict` route expecting:

- num_comments;
- post_length;
- hour;
- title_length;
- sentiment.

It returns:

```json
{
  "prediction": 0
}
```

or:

```json
{
  "prediction": 1
}
```

### Current Integration Status

The ML Flask service is **not integrated into the production backend runtime**.

The main backend uses:

- `backend/services/mlService.js`
- `backend/services/potentialClassifier.js`

This internal classifier maps trend scores to:

- HIGH when score >= 70;
- LOW when score < 70;
- UNAVAILABLE when score is missing or invalid.

Reason:

- current Reddit collection may not consistently provide all historical features required by the ML model;
- runtime scoring is more stable and explainable for demonstration.

### ML Limitations

- `train.py` imports XGBoost, but `requirements.txt` does not include xgboost;
- `app.py` has a duplicated route decorator for `/predict`;
- Dockerfile exposes port 5001 while `app.py` runs directly on port 5000 when using `python app.py`;
- the saved model path `models/trend_predictor.pkl` must exist for Flask startup;
- not part of `docker-compose.yml`.

---

## 10. Database Design

### Collections

MongoDB collections:

- users;
- trends.

### User Schema

File:

- `backend/models/User.js`

Fields:

- `name`: string, required;
- `email`: string, required, unique;
- `password`: string, required, hashed;
- `preferences`: array of strings, default empty;
- `savedTrends`: array of ObjectIds referencing Trend;
- `aiRemaining`: number, default from `AI_ANALYSIS_QUOTA`;
- `aiLastReset`: date, default Date.now;
- timestamps: createdAt, updatedAt.

Relationships:

- one user can save many trends;
- `savedTrends` references Trend documents.

### Trend Schema

File:

- `backend/models/Trend.js`

Core fields:

- title;
- source;
- category;
- score;
- scoreDetails;
- excerpt;
- ml_prediction;
- popularity;
- growth;
- link;
- slug;
- fetchedAt;
- savedCount;
- tags.

Credibility fields:

- credibilityScore;
- credibilityConfidence;
- verificationStatus;
- verifiedSources;
- credibilityExplanation;
- isFakeNews;
- credibilitySignals.

ML/feature fields:

- num_comments;
- post_length;
- hour;
- title_length;
- sentiment.

Media fields:

- image;
- video;
- thumbnail;
- mediaType;
- mediaFingerprint;
- mediaVerifiedAt;
- mediaSource.

Indexes:

- `{ score: -1, updatedAt: -1 }`
- `{ fetchedAt: -1, createdAt: -1 }`
- `{ category: 1, score: -1 }`
- `{ source: 1 }`
- `{ verificationStatus: 1, credibilityScore: -1 }`
- text index on title, tags, category and excerpt.

Unique field:

- slug.

### Data Consistency

Trend persistence uses upsert by slug:

```text
findOneAndUpdate({ slug }, { $set: update, $setOnInsert: { savedCount: 0 }})
```

This prevents duplicate trend documents for the same source/title combination.

---

## 11. Security

### Authentication

JWT authentication is implemented in `authMiddleware.js`.

Behavior:

- expects `Authorization: Bearer <token>`;
- verifies token using `JWT_SECRET`;
- loads user by decoded id;
- excludes password and `__v`;
- rejects missing, invalid or expired tokens.

### Authorization

Protected routes require `protect` middleware.

Protected:

- profile;
- preferences;
- saved trends;
- feed;
- search;
- trend detail;
- AI analysis;
- save/unsave;
- assistant chat.

Public:

- signup;
- login;
- root health response.

### Password Security

Passwords are:

- validated for length;
- salted with bcrypt;
- hashed before storage;
- never returned in login/profile responses.

### Rate Limiting

General limiter:

- 600 requests per 15 minutes by default;
- configurable with `RATE_LIMIT_MAX`.

Auth limiter:

- 30 auth attempts per 15 minutes;
- applies to signup and login;
- configurable with `AUTH_RATE_LIMIT_MAX`.

### Input Validation

Backend validates:

- email;
- name;
- password length;
- preferences array;
- ObjectId parameters for trend routes;
- message presence for assistant chat.

### Security Middleware

Used in `app.js`:

- Helmet;
- CORS;
- Express JSON body limit 10kb;
- URL encoded body limit 10kb;
- express-mongo-sanitize;
- rate limit;
- request logging;
- centralized error handling.

### CORS

CORS origin is controlled by `FRONTEND_URL`.

Allowed methods:

- GET;
- POST;
- PUT;
- DELETE;
- OPTIONS.

Allowed headers:

- Content-Type;
- Authorization.

### Error Handling

Centralized error handler returns:

- `success: false`;
- message;
- optional status such as `ai_unavailable`;
- stack only in development and not for AI unavailable errors.

---

## 12. DevOps

### Environment Variables

Required:

- MONGO_URI;
- JWT_SECRET;
- GROQ_API_KEY.

Common optional:

- GROQ_MODEL;
- SERPAPI_KEY;
- FRONTEND_URL;
- PORT;
- NODE_ENV;
- AI_ANALYSIS_QUOTA;
- TREND_INGEST_LIMIT;
- TREND_PERSIST_LIMIT;
- TREND_CACHE_DURATION_MS;
- REDDIT_FETCH_LIMIT;
- REDDIT_MAX_RETRIES;
- REDDIT_DISABLED_SUBREDDITS;
- REDDIT_CLIENT_ID;
- REDDIT_CLIENT_SECRET;
- REDDIT_USERNAME;
- REDDIT_PASSWORD;
- REDDIT_USER_AGENT;
- GOOGLE_TRENDS_LIMIT.

`.env.example` provides a safe template.

### Root Commands

Root `package.json` scripts:

- `npm run dev:backend`;
- `npm run dev:frontend`;
- `npm test`;
- `npm run build`;
- `npm run lint`.

### Backend Commands

- `npm run dev`
- `npm start`
- `npm test`

### Frontend Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Docker

`docker-compose.yml` defines:

- MongoDB service;
- backend service;
- frontend service.

MongoDB:

- image `mongo:6.0`;
- port 27017;
- persistent volume `mongo_data`.

Backend:

- build context `./backend`;
- port 5000;
- environment includes Mongo URI, JWT secret, Groq key, Groq model, SerpAPI key.

Frontend:

- build context `./frontend`;
- preview port 4173.

ML service:

- has its own Dockerfile;
- not included in docker-compose.

### Build Process

Frontend production build:

```bash
npm run build
```

Backend start:

```bash
npm start
```

Validation commands:

```bash
npm test
npm run lint
npm run build
```

---

## 13. Testing

Testing uses Node.js built-in test runner.

Command:

```bash
cd backend
npm test
```

Root command:

```bash
npm test
```

### Test Files

`backend/test/analyzeTrend.test.js`

Validates:

- analysis always regenerates even if old stored values exist;
- old fallback values do not bypass Groq;
- AI failure returns `ai_unavailable`;
- quota is refunded on AI failure;
- quota is reserved atomically;
- invalid trend IDs are rejected.

`backend/test/assistantRelevance.test.js`

Validates:

- topic extraction from user search intent;
- relevant trend outranks unrelated high-score trend;
- business is treated as topic only in domain query;
- public sanitizer removes technical terms.

`backend/test/feedSearch.test.js`

Validates:

- Mongo search query covers title, tags, category, excerpt and link;
- direct subject match beats unrelated high-score trend.

`backend/test/credibilityService.test.js`

Validates:

- trusted editorial links can be verified;
- community trends without evidence are not marked verified;
- risky untrusted content can be flagged.

`backend/test/feedSync.test.js`

Validates:

- feed sync avoids AI batch calls;
- feed sync avoids direct ML calls in the test scenario;
- feed sync persists scored trends.

`backend/test/feedSyncInterval.test.js`

Validates:

- default feed sync interval is 60 minutes.

`backend/test/trendService.imageRepair.test.js`

Validates:

- blank image fields can fallback to existing thumbnails before persistence.

### Final Validation State

The project has been validated with:

```text
npm test      PASS
npm run lint  PASS
npm run build PASS
```

---

## 14. Challenges Encountered

### Reddit API Limitations

Reddit collection faced:

- OAuth availability issues;
- RSS fallback dependency;
- 429 responses;
- slow responses from some subreddits;
- inconsistent engagement fields in RSS.

Mitigation:

- OAuth support when credentials exist;
- RSS fallback;
- disabled problematic subreddits by default;
- feed cache;
- no external media enrichment pipeline.

### Media Pipeline Limitations

An earlier external media enrichment pipeline caused unnecessary calls and latency.

Final state:

- no Google Trends image search;
- no Openverse;
- no Wikimedia;
- no external media enrichment;
- only Reddit/source-provided media is used;
- trends without images render without images.

### AI Limitations

Observed issues during development:

- generic AI phrases;
- old cached analysis content;
- English leakage;
- fallback-generated generic content;
- provider dependency.

Final mitigations:

- no persistent analysis cache;
- no local fallback reports;
- stricter prompt;
- structured JSON output;
- response validation;
- frontend error messages for AI unavailable state.

### Search Relevance Challenge

Problem:

- high-score unrelated trends could outrank topic-specific trends.

Mitigation:

- search relevance now outranks raw score;
- assistant extracts topic terms before choosing context;
- no unrelated recommendation when a topic is specified.

### ML Limitations

The ML module depends on historical engagement features that are not always available in live collection.

Mitigation:

- ML module remains as experimental component;
- runtime uses stable score-based classifier.

### Performance Challenges

Earlier issues:

- external media enrichment caused many HTTP calls;
- Reddit 429 delays slowed first feed sync;
- automatic feed pagination loaded pages without user action.

Final mitigations:

- media enrichment removed;
- problematic subreddits disabled by default;
- no fallback pagination timer;
- feedSync interval fixed at 60 minutes;
- memory cache for external trends.

---

## 15. Future Improvements

Realistic future improvements:

1. Add dedicated MongoDB Atlas Search for more scalable search.
2. Add semantic search with embeddings.
3. Add background job queue for feed sync.
4. Add dashboard analytics for category/source performance.
5. Add provider health monitoring for Groq, Reddit and SerpAPI.
6. Add frontend automated tests.
7. Add CI/CD pipeline with tests and build checks.
8. Add Redis cache for multi-instance deployment.
9. Add notification system for saved categories.
10. Improve ML module with a newer dataset and live feature parity.
11. Add user-level trend interaction history.
12. Add alert rules for specific keywords.
13. Add export to PDF for AI reports.
14. Add multilingual interface.
15. Add more sources such as YouTube, Product Hunt or Hacker News.

---

## 16. Jury Preparation

### Likely Questions and Suggested Answers

#### Question 1: What problem does Trendify solve?

Suggested answer:

Trendify solves the problem of fragmented trend discovery. Trends appear across multiple sources, and users need a way to collect, rank and interpret those signals quickly. Trendify centralizes Reddit and Google Trends signals, scores them, personalizes the feed and generates AI analysis.

#### Question 2: Why did you use Reddit and Google Trends?

Suggested answer:

Reddit provides community-driven discussion signals, while Google Trends provides search-interest signals. Combining both allows the project to capture both conversation and search demand.

#### Question 3: How is the trend score calculated?

Suggested answer:

The score is explainable and based on popularity, growth, engagement, sentiment, recency, source confidence and uniqueness. The formula is stored in `scoreDetails` for transparency.

#### Question 4: Is the feed really personalized?

Suggested answer:

Yes. User preferences are stored in MongoDB and mapped to real trend categories. The backend applies strict category filtering before pagination, so different users see different categories.

#### Question 5: What does Trendi do?

Suggested answer:

Trendi is not a generic chatbot. It retrieves the most relevant stored trends from MongoDB, builds a context and asks Groq to respond as a strategic trend analyst.

#### Question 6: Are AI analyses stored in MongoDB?

Suggested answer:

No. Analyses are generated on demand and returned to the frontend. This avoids showing old analyses after prompt improvements and guarantees the latest prompt is used.

#### Question 7: What happens if Groq is unavailable?

Suggested answer:

The backend returns a clean `ai_unavailable` status. The frontend displays a clear error. No fake local AI report is generated.

#### Question 8: Is the ML model used in production?

Suggested answer:

The repository contains an experimental ML module trained on historical Reddit data. The main application currently uses an explainable score-based classifier because live source data is more stable for the current demonstration.

#### Question 9: How do you avoid duplicate trends?

Suggested answer:

The pipeline normalizes titles and removes duplicates during source merging. MongoDB persistence also uses a unique slug generated from source and title.

#### Question 10: How do you handle security?

Suggested answer:

The backend uses JWT authentication, bcrypt password hashing, protected routes, rate limiting, Helmet, CORS restrictions, body size limits, mongo sanitization and centralized error handling.

### Technical Justifications

Why MongoDB:

- flexible trend schema;
- heterogeneous source metadata;
- easy storage of mixed scoring and credibility details.

Why Express:

- simple REST API;
- strong middleware ecosystem;
- good fit for PFA scope.

Why Groq:

- fast AI responses;
- compatible chat completions API;
- good for on-demand reports.

Why no local AI fallback:

- avoids fake analysis;
- keeps AI features honest;
- shows clear unavailable state when provider fails.

Why strict preference filtering:

- easier to explain;
- predictable user behavior;
- no hidden score manipulation.

---

## 17. Presentation Material

### Key Statistics

Technical statistics from the final project:

- 3 main packages: backend, frontend, ml-model.
- 2 MongoDB collections: users and trends.
- 3 main API route groups: users, feed, assistant.
- Feed sync interval: 60 minutes.
- Feed default page size: 24.
- Backend feed limit max: 100.
- Search limit max: 50.
- Search scan limit: 500.
- AI quota default: 1000 analyses per user.
- Groq timeout: 15000 ms.
- Google Trends timeout: 5000 ms.
- Reddit RSS/API timeout: 30000 ms.
- Trend cache duration: 10 minutes.
- Score range: 35 to 95.
- Potential threshold: HIGH if score >= 70.

### Key Achievements

- full-stack application;
- real authentication;
- protected API;
- trend collection from external sources;
- data cleaning and deduplication;
- explainable scoring;
- strict personalized feed;
- dedicated search page;
- saved trends;
- AI strategic report;
- Trendi assistant;
- voice input/output;
- credibility evaluation;
- backend tests;
- Docker configuration;
- modern UI.

### Strengths

- complete product journey;
- clear architecture;
- real MongoDB persistence;
- real external APIs;
- no simulated AI fallback;
- explainable scoring;
- improved search relevance;
- modern frontend navigation;
- strong demo flow.

### Limitations

- external APIs can fail or rate-limit;
- credibility is not full fact-checking;
- AI quality depends on Groq;
- ML module is experimental;
- frontend has no automated tests;
- production deployment would need monitoring and CI/CD.

### Recommended Demo Scenario

1. Open landing page.
2. Sign up or log in.
3. Open Home and show summary cards.
4. Open Profile and select preferences.
5. Open Explorer and show personalized feed.
6. Search for a precise topic such as GTA 6.
7. Open a trend detail page.
8. Save the trend.
9. Open the AI report.
10. Ask Trendi a strategic question.
11. Show Favorites.

### Demo Talking Points

- "The application collects trends from real external sources."
- "The feed is personalized according to user preferences."
- "Search is independent from the feed and searches stored trends."
- "The AI report is generated on demand."
- "Trendi uses the trends stored in the platform, not random web answers."
- "The system includes a conservative credibility layer."

---

## 18. Report Material

### Suggested Academic Report Structure

#### Chapter 1 - General Introduction

Content:

- context of online trends;
- problem statement;
- motivation;
- project objectives;
- target users;
- scope.

#### Chapter 2 - Functional Study

Content:

- functional requirements;
- user roles;
- user journey;
- authentication;
- feed;
- search;
- favorites;
- preferences;
- AI analysis;
- Trendi assistant.

#### Chapter 3 - Technical Architecture

Content:

- global architecture;
- frontend/backend separation;
- REST API;
- MongoDB;
- external services;
- diagrams;
- data flow.

#### Chapter 4 - Data Collection and Processing

Content:

- Reddit collection;
- Google Trends collection;
- cleaning;
- validation;
- deduplication;
- cache;
- scoring;
- persistence.

#### Chapter 5 - Artificial Intelligence System

Content:

- Groq provider;
- prompt engineering;
- JSON response format;
- report sections;
- error handling;
- Trendi assistant;
- limitations.

#### Chapter 6 - Credibility and Scoring

Content:

- trend score formula;
- credibility source baselines;
- trusted domains;
- risk markers;
- confidence calculation;
- verification status.

#### Chapter 7 - Machine Learning Module

Content:

- dataset;
- features;
- target variable;
- models tested;
- training process;
- evaluation process;
- integration status;
- future improvements.

#### Chapter 8 - Frontend Implementation

Content:

- React structure;
- routing;
- contexts;
- pages;
- components;
- responsive design;
- Trendi widget;
- AI report UI.

#### Chapter 9 - Security and DevOps

Content:

- JWT;
- password hashing;
- rate limiting;
- CORS;
- Helmet;
- environment variables;
- Docker;
- tests and validation.

#### Chapter 10 - Testing and Validation

Content:

- backend tests;
- frontend build;
- lint;
- runtime validation;
- major bugs fixed;
- performance optimizations.

#### Chapter 11 - Challenges and Solutions

Content:

- Reddit 429;
- media pipeline latency;
- AI generic responses;
- AI cache problem;
- search relevance;
- feed auto-pagination bug;
- ElevenLabs rollback;
- ML feature limitations.

#### Chapter 12 - Conclusion and Perspectives

Content:

- project summary;
- achievements;
- limitations;
- future work;
- academic contribution.

### Section Content Suggestions

Problem statement:

Trend discovery is fragmented across sources. Manual monitoring is slow and does not provide direct strategic interpretation.

Solution statement:

Trendify unifies external trend collection, scoring, personalization and AI analysis in one platform.

Technical contribution:

The project combines full-stack development, data engineering, AI integration, MongoDB modeling, authentication and UI/UX design.

Academic contribution:

The project demonstrates how raw digital signals can be converted into decision-support information through a structured data pipeline and AI-assisted interpretation.

---

## Appendix A - File-by-File Functional Map

### Backend

- `backend/app.js`: Express app configuration, security middleware, routes and error handling.
- `backend/server.js`: server startup and background feed sync startup.
- `backend/config/config.js`: environment variable loading and runtime constants.
- `backend/config/db.js`: MongoDB connection.
- `backend/models/User.js`: user schema.
- `backend/models/Trend.js`: trend schema and indexes.
- `backend/routes/userRoutes.js`: auth/profile/preferences/saved trends routes.
- `backend/routes/feedRoutes.js`: feed/search/detail/analyze/save routes.
- `backend/routes/assistantRoutes.js`: assistant chat route.
- `backend/controllers/userController.js`: register, login, preferences, save/unsave, saved trends.
- `backend/controllers/feedController.js`: feed, search, detail, analysis.
- `backend/controllers/assistantController.js`: assistant request validation and response.
- `backend/middleware/authMiddleware.js`: JWT verification and AI quota reset.
- `backend/middleware/errorMiddleware.js`: centralized errors.
- `backend/middleware/requestLogger.js`: HTTP request duration logging.
- `backend/middleware/notFoundMiddleware.js`: 404 handling.
- `backend/middleware/asyncHandler.js`: async route wrapper.
- `backend/services/feedSync.js`: hourly background sync.
- `backend/services/trendService.js`: scoring, persistence, feed querying, related trends.
- `backend/services/aiService.js`: Groq analysis generation.
- `backend/services/assistantService.js`: Trendi assistant logic.
- `backend/services/credibilityService.js`: credibility scoring.
- `backend/services/mlService.js`: internal prediction wrapper.
- `backend/services/potentialClassifier.js`: score threshold classifier.
- `backend/services/featureGenerator.js`: feature normalization.
- `backend/services/data/index.js`: source aggregation, cache, source interleaving.
- `backend/services/data/redditService.js`: Reddit trend extraction.
- `backend/services/data/redditApi.js`: Reddit OAuth API and RSS fallback.
- `backend/services/data/redditRss.js`: Reddit RSS parser.
- `backend/services/data/googleTrendsService.js`: SerpAPI Google Trends fetch.
- `backend/services/data/cleaner.js`: cleaning, validation, sentiment estimation.
- `backend/services/data/mediaExtractor.js`: Reddit/source media extraction.
- `backend/services/data/mediaUniqueness.js`: media fingerprinting.

### Frontend

- `frontend/src/main.jsx`: React entry point.
- `frontend/src/App.jsx`: routing, providers, global assistant/background.
- `frontend/src/api/axios.js`: Axios API client and token handling.
- `frontend/src/context/AuthContext.jsx`: user session state.
- `frontend/src/context/ThemeContext.jsx`: light/dark theme state.
- `frontend/src/components/PrivateRoute.jsx`: protected route wrapper.
- `frontend/src/components/Navbar.jsx`: public nav, desktop sidebar, mobile dock.
- `frontend/src/components/AssistantWidget.jsx`: Trendi chat, speech input/output.
- `frontend/src/components/Ambient3DBackground.jsx`: visual background.
- `frontend/src/components/Button.jsx`: reusable button.
- `frontend/src/components/Input.jsx`: reusable input.
- `frontend/src/components/EmptyState.jsx`: empty/error state component.
- `frontend/src/components/LoadingSkeleton.jsx`: skeleton loading.
- `frontend/src/components/MediaBox.jsx`: image/video display.
- `frontend/src/pages/LandingPage.jsx`: public product landing.
- `frontend/src/pages/Login.jsx`: login form.
- `frontend/src/pages/Signup.jsx`: signup form.
- `frontend/src/pages/Home.jsx`: authenticated home dashboard.
- `frontend/src/pages/Feed.jsx`: Explorer feed.
- `frontend/src/pages/SearchPage.jsx`: dedicated search.
- `frontend/src/pages/Favorites.jsx`: saved trends page.
- `frontend/src/pages/Profile.jsx`: preferences, user info, theme.
- `frontend/src/pages/TrendDetail.jsx`: trend detail page.
- `frontend/src/pages/AIWorkspace.jsx`: AI report page.
- `frontend/src/pages/Preferences.jsx`: legacy preferences page.
- `frontend/src/utils/ui.js`: score formatting and UI helpers.
- `frontend/src/utils/media.js`: media URL normalization.
- `frontend/src/utils/feedMix.js`: seen trend tracking and frontend mix.

### ML

- `ml-model/train.py`: trains experimental classifiers and saves model.
- `ml-model/app.py`: Flask prediction API.
- `ml-model/predict.py`: local prediction example.
- `ml-model/requirements.txt`: Python dependencies.
- `ml-model/Dockerfile`: ML service container definition.
- `ml-model/data/Redit_data.csv`: Reddit historical dataset.
- `ml-model/data/trends_dataset.csv`: additional trend dataset.

---

## Appendix B - Main Environment Configuration

Example:

```env
MONGO_URI=mongodb://localhost:27017/trend_predictor
JWT_SECRET=replace-with-a-long-random-secret
GROQ_API_KEY=gsk_replace_me
GROQ_MODEL=llama-3.3-70b-versatile
SERPAPI_KEY=replace-me-if-google-trends-is-enabled
FRONTEND_URL=http://localhost:4173
PORT=5000
NODE_ENV=production
AI_ANALYSIS_QUOTA=1000
REDDIT_DISABLED_SUBREDDITS=entertainment,cybersecurity,space
```

---

## Appendix C - Final Project Positioning

Trendify should be positioned as:

- a full-stack PFA project;
- a trend monitoring and analysis platform;
- a data pipeline and AI-assisted decision tool;
- a product-like web application with real user flows.

Trendify should not be positioned as:

- a fully industrial SaaS platform;
- a complete fact-checking product;
- a production-grade ML prediction system.

The best academic positioning is:

> Trendify is a complete trend intelligence platform that combines real data collection, explainable scoring, personalization and AI-assisted strategic analysis.

