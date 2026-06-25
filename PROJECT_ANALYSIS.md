# PROJECT_ANALYSIS.md

# Analyse complète factuelle du projet Trendify

Document généré à partir du code présent dans le dépôt `D:\PFA_V1`.

Ce document décrit uniquement ce qui est présent dans le projet. Les éléments non trouvés dans le code sont indiqués explicitement par la mention : `Non trouvé dans le projet.`

## 1. Résumé exécutif

### Nom du projet

Le projet s'appelle `Trendify`.

Preuves dans le projet :

- `README.md` : titre `# Trendify`.
- `frontend/index.html` : `<title>Trendify</title>`.
- `frontend/public/manifest.webmanifest` : `"name": "Trendify"`.
- `frontend/src/components/Navbar.jsx` : marque affichée `Trendify`.

### Problème traité

Le projet centralise des signaux de tendances issus de Reddit et Google Trends, puis les nettoie, les score, les stocke et les affiche dans une application web.

Preuves dans le projet :

- `README.md` indique que Trendify collecte des signaux depuis Reddit et Google Trends.
- `backend/services/data/index.js` agrège `getRedditTrends()` et `getGoogleTrends()`.
- `backend/services/trendService.js` score et persiste les tendances dans MongoDB.
- `frontend/src/pages/Feed.jsx` affiche le feed.

### Solution proposée

Trendify fournit :

- une authentification JWT ;
- un feed de tendances ;
- un filtrage par catégories et préférences utilisateur ;
- une recherche dédiée ;
- des favoris ;
- une page détail de tendance ;
- une carte géographique Google Trends quand les données existent ;
- un rapport IA généré à la demande ;
- un assistant Trendi avec texte, voix, navigation et actions structurées.

### Utilisateurs cibles présents dans les textes du projet

Les textes visibles indiquent les usages suivants :

- utilisateurs qui veulent découvrir des sujets émergents ;
- utilisateurs qui veulent filtrer les tendances selon leurs préférences ;
- utilisateurs qui veulent sauvegarder des signaux ;
- utilisateurs qui veulent générer des rapports IA ;
- utilisateurs qui veulent obtenir des idées business ou de contenu via Trendi.

Preuves :

- `README.md`.
- `frontend/src/pages/LandingPage.jsx`.
- `frontend/src/components/AssistantWidget.jsx`.
- `backend/services/assistantService.js`.

## 2. Structure générale du dépôt

### Racine

Fichiers et dossiers trouvés :

- `.git/`
- `backend/`
- `frontend/`
- `ml-model/`
- `.gitignore`
- `docker-compose.yml`
- `package.json`
- `package-lock.json`
- `README.md`
- `PROJECT_ANALYSIS.md`

### Scripts racine

Fichier : `package.json`

Scripts trouvés :

- `dev:backend` : `npm --prefix backend run dev`
- `dev:frontend` : `npm --prefix frontend run dev`
- `test` : `npm --prefix backend test`
- `build` : `npm --prefix frontend run build`
- `lint` : `npm --prefix frontend run lint`

### État Git observé au moment de l'analyse

Branche :

- `main`

Dernier commit :

- `05d8212 version final`

Modifications non commitées observées avant la création de ce fichier :

- `frontend/src/index.css`
- `frontend/src/pages/Feed.jsx`
- `frontend/src/pages/SearchPage.jsx`
- `frontend/src/pages/TrendDetail.jsx`
- `frontend/src/utils/ui.js`

Ces modifications existent dans l'arbre de travail courant. Elles ne sont pas dans le dernier commit `05d8212`.

## 3. Architecture globale

### Vue d'ensemble réelle

```text
Utilisateur
  |
  v
Frontend React / Vite
  |
  | Axios + JWT Bearer token
  v
Backend Node.js / Express
  |
  | Mongoose
  v
MongoDB

Backend Express communique aussi avec :
  - Reddit OAuth API si les identifiants existent
  - Reddit RSS en fallback
  - SerpAPI pour Google Trends Trending Now
  - google-trends-api pour interest by region
  - Groq API pour les rapports IA et Trendi

ml-model existe séparément :
  - Flask
  - scikit-learn
  - joblib
  - modèle pkl
  - endpoint /predict
```

### Communication frontend-backend

Le frontend utilise `frontend/src/api/axios.js`.

Configuration :

- `API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'`
- Intercepteur request :
  - lit `localStorage.getItem('token')`
  - ajoute `Authorization: Bearer <token>`
- Intercepteur response :
  - si réponse `401` hors login/signup :
    - supprime le token localStorage ;
    - redirige vers `/login?expired=1`.

### Communication backend-MongoDB

Fichier : `backend/config/db.js`

Configuration Mongoose :

- `mongoose.set("strictQuery", true)`
- `mongoose.connect(process.env.MONGO_URI, {...})`
- `serverSelectionTimeoutMS: 5000`
- `socketTimeoutMS: 45000`
- `connectTimeoutMS: 10000`
- `autoIndex: false`
- `family: 4`

### Communication backend-Groq

Fichiers :

- `backend/services/aiService.js`
- `backend/services/assistantService.js`

Endpoint externe :

- `https://api.groq.com/openai/v1/chat/completions`

Headers :

- `Authorization: Bearer ${process.env.GROQ_API_KEY}`
- `Content-Type: application/json`

Timeout :

- `15000 ms`

Modèle par défaut :

- `llama-3.3-70b-versatile`

### Communication backend-Reddit

Fichiers :

- `backend/services/data/redditService.js`
- `backend/services/data/redditApi.js`
- `backend/services/data/redditRss.js`
- `backend/services/data/redditSubreddits.js`

Modes :

- OAuth API si `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` et `REDDIT_USER_AGENT` existent.
- RSS fallback si OAuth manque ou échoue.

Endpoints :

- Token OAuth : `https://www.reddit.com/api/v1/access_token`
- OAuth posts : `https://oauth.reddit.com/r/<subreddit>/hot?limit=<limit>`
- RSS fallback : `https://www.reddit.com/r/<subreddit>/.rss?limit=<limit>`

### Communication backend-Google Trends

Fichier : `backend/services/data/googleTrendsService.js`

Deux usages distincts :

1. Tendances principales :
   - API : SerpAPI
   - endpoint : `https://serpapi.com/search.json`
   - paramètres :
     - `engine: "google_trends_trending_now"`
     - `geo: "US"`
     - `api_key: API_KEY`

2. Intérêt par région :
   - bibliothèque : `google-trends-api`
   - méthode : `googleTrends.interestByRegion`
   - résolution : `COUNTRY`
   - langue : `en-US`
   - timeout manuel : `6000 ms`

## 4. Backend

### Stack backend

Fichier : `backend/package.json`

Dépendances :

- `axios`
- `bcryptjs`
- `cors`
- `dotenv`
- `express`
- `express-mongo-sanitize`
- `express-rate-limit`
- `google-trends-api`
- `helmet`
- `jsonwebtoken`
- `mongoose`
- `rss-parser`

Dev dependency :

- `nodemon`

Scripts backend :

- `start` : `node server.js`
- `dev` : `nodemon server.js`
- `test` : `node --test test/*.js`

### Application Express

Fichier : `backend/app.js`

Rôle :

- charge `.env` depuis `backend/.env` ;
- crée l'application Express ;
- connecte MongoDB ;
- applique middlewares de sécurité ;
- monte les routes API ;
- expose un endpoint racine ;
- applique les middlewares 404 et erreurs.

Middlewares appliqués :

- `helmet()`
- `express.json({ limit: "10kb" })`
- `express.urlencoded({ extended: false, limit: "10kb" })`
- `mongoSanitize()`
- `cors(corsOptions)`
- `generalLimiter`
- `requestLogger`
- `notFound`
- `errorHandler`

Routes montées :

- `/api/users`
- `/api/feed`
- `/api/assistant`

Endpoint racine :

- `GET /`
- réponse : `{ success: true, message: "Backend running" }`

### Serveur backend

Fichier : `backend/server.js`

Rôle :

- importe `app`
- écoute sur `PORT`
- lance `start()` depuis `backend/services/feedSync.js`

Comportement au démarrage :

- démarre le serveur HTTP ;
- tente de démarrer la synchronisation du feed ;
- loggue l'échec si `feedSync.start()` échoue.

## 5. Configuration backend

### `backend/config/config.js`

Variables lues :

- `FRONTEND_URL`
- `MONGO_URI`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `JWT_EXPIRATION`
- `AI_ANALYSIS_QUOTA`
- `TREND_INGEST_LIMIT`
- `TREND_PERSIST_LIMIT`
- `TREND_CACHE_DURATION_MS`
- `REDDIT_FETCH_LIMIT`
- `REDDIT_MAX_RETRIES`
- `REDDIT_DISABLED_SUBREDDITS`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`
- `REDDIT_USER_AGENT`
- `GOOGLE_TRENDS_LIMIT`
- `GROQ_API_KEY`
- `GROQ_MODEL`

Variables obligatoires dans le code :

- `MONGO_URI`
- `JWT_SECRET`

Si l'une de ces deux variables est absente, le fichier lance une erreur.

Valeurs par défaut trouvées :

- `FRONTEND_URL`: `http://localhost:4173`
- `PORT`: `5000`
- `NODE_ENV`: `production`
- `JWT_EXPIRATION`: `7d`
- `AI_ANALYSIS_QUOTA`: `1000`
- `TREND_INGEST_LIMIT`: `5000`
- `TREND_PERSIST_LIMIT`: `1000`
- `TREND_CACHE_DURATION_MS`: `10 * 60 * 1000`
- `REDDIT_FETCH_LIMIT`: `75`
- `REDDIT_MAX_RETRIES`: `3`
- `REDDIT_DISABLED_SUBREDDITS`: `entertainment,cybersecurity,space`
- `REDDIT_USER_AGENT`: `Trendify/1.0 (+https://trendify.local)`
- `GOOGLE_TRENDS_LIMIT`: `120`
- `GROQ_MODEL`: `llama-3.3-70b-versatile`

### `.env` observé

Fichier trouvé :

- `backend/.env`

Noms de variables présents, sans valeurs :

- `MONGO_URI`
- `PORT`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `SERPAPI_KEY`
- `NODE_ENV`

### `.env.example`

Fichier `.env.example` à la racine :

- Non trouvé dans le projet.

Fichier `backend/.env.example` :

- Non trouvé dans le projet.

## 6. Modèles MongoDB

### Modèle User

Fichier : `backend/models/User.js`

Collection Mongoose :

- `User`

Champs :

- `name`
  - type `String`
  - required
- `email`
  - type `String`
  - required
  - unique
- `password`
  - type `String`
  - required
- `preferences`
  - type `[String]`
  - default `[]`
- `savedTrends`
  - type `[ObjectId]`
  - ref `Trend`
  - default `[]`
- `aiRemaining`
  - type `Number`
  - default `AI_ANALYSIS_QUOTA`
- `aiLastReset`
  - type `Date`
  - default `Date.now`

Options :

- `timestamps: true`

### Modèle Trend

Fichier : `backend/models/Trend.js`

Collection Mongoose :

- `Trend`

Champs :

- `title`
  - `String`
  - required
  - trim
- `source`
  - `String`
  - required
  - trim
- `category`
  - `String`
  - default `General`
  - trim
- `score`
  - `Number`
  - default `0`
- `scoreDetails`
  - `Mixed`
  - default `{}`
- `credibilityScore`
  - `Number`
  - default `0`
- `credibilityConfidence`
  - `String`
  - enum `low`, `medium`, `high`
  - default `low`
- `verificationStatus`
  - enum `verified`, `partially_verified`, `unverified`, `unverifiable`, `disputed`
  - default `unverified`
- `verifiedSources`
  - `[Mixed]`
  - default `[]`
- `credibilityExplanation`
  - `String`
  - default `""`
- `isFakeNews`
  - `Boolean`
  - default `false`
- `credibilitySignals`
  - `Mixed`
  - default `{}`
- `excerpt`
  - `String`
  - default `""`
- `ml_prediction`
  - `String`
  - default `UNAVAILABLE`
- `popularity`
  - `Number`
  - default `0`
- `growth`
  - `Number`
  - default `0`
- `num_comments`
  - `Number`
  - default `0`
- `post_length`
  - `Number`
  - default `0`
- `hour`
  - `Number`
  - default `0`
- `title_length`
  - `Number`
  - default `0`
- `sentiment`
  - `Number`
  - default `0`
- `image`
  - `String`
  - default `""`
- `video`
  - `String`
  - default `""`
- `thumbnail`
  - `String`
  - default `""`
- `mediaType`
  - enum `image`, `video`, `none`
  - default `none`
- `mediaFingerprint`
  - `String`
  - default `""`
- `mediaVerifiedAt`
  - `Date`
  - default `null`
- `mediaSource`
  - `String`
  - default `""`
- `link`
  - `String`
  - default `""`
- `slug`
  - `String`
  - required
  - unique
  - trim
- `fetchedAt`
  - `Date`
  - default `Date.now`
- `savedCount`
  - `Number`
  - default `0`
- `tags`
  - `[String]`
  - default `[]`
- `geoInterest`
  - tableau d'objets :
    - `country`
    - `countryCode`
    - `value`

Options :

- `timestamps: true`

Index :

- `{ score: -1, updatedAt: -1 }`
- `{ fetchedAt: -1, createdAt: -1 }`
- `{ category: 1, score: -1 }`
- `{ source: 1 }`
- `{ verificationStatus: 1, credibilityScore: -1 }`
- index textuel :
  - `title`
  - `tags`
  - `category`
  - `excerpt`

## 7. Middleware

### `asyncHandler.js`

Rôle :

- wrappe une fonction async Express ;
- transmet les erreurs à `next`.

### `authMiddleware.js`

Export :

- `protect`

Rôle :

- lit le header `Authorization`;
- exige un Bearer token ;
- vérifie le JWT avec `JWT_SECRET`;
- charge l'utilisateur par `User.findById(decoded.id).select("-password -__v")`;
- ajoute l'utilisateur à `req.user`;
- initialise `aiRemaining` si absent ;
- réinitialise le quota IA si `aiLastReset` est absent, invalide ou antérieur au jour courant.

Erreurs :

- absence de token : `401`
- token invalide ou expiré : `401`
- utilisateur introuvable : `401`

### `errorMiddleware.js`

Rôle :

- construit une réponse JSON :
  - `success: false`
  - `message`
  - `status` si présent sur l'erreur
  - `stack` uniquement si `NODE_ENV === "development"` et si `err.status !== "ai_unavailable"`
- loggue en `error` pour les statuts >= 500 ;
- loggue en `warn` sinon.

### `notFoundMiddleware.js`

Rôle :

- crée une erreur `404` pour les routes non trouvées.

### `requestLogger.js`

Rôle :

- mesure la durée d'une requête ;
- loggue `[HTTP] METHOD URL STATUS DURATION`.

Les logs `info` sont conditionnés par `logger.isVerboseLoggingEnabled()`.

## 8. Routes API REST

### Routes utilisateurs

Fichier : `backend/routes/userRoutes.js`

Base :

- `/api/users`

Endpoints :

| Méthode | Route | Auth | Controller / logique |
|---|---|---|---|
| POST | `/signup` | Non | `registerUser` |
| POST | `/login` | Non | `loginUser` |
| PUT | `/preferences` | Oui | `updatePreferences` |
| GET | `/profile` | Oui | callback inline |
| GET | `/saved-trends` | Oui | `getSavedTrends` |

Rate limit spécifique auth :

- fenêtre : 15 minutes
- max par défaut : `30`
- variable : `AUTH_RATE_LIMIT_MAX`

### Routes feed

Fichier : `backend/routes/feedRoutes.js`

Base :

- `/api/feed`

Tous les endpoints sont protégés par JWT.

| Méthode | Route | Controller |
|---|---|---|
| GET | `/` | `getFeed` |
| GET | `/search` | `searchTrends` |
| GET | `/:id` | `getTrendDetail` |
| POST | `/:id/analyze` | `analyzeTrend` |
| POST | `/:id/save` | `saveTrend` |
| DELETE | `/:id/save` | `unsaveTrend` |

### Routes assistant

Fichier : `backend/routes/assistantRoutes.js`

Base :

- `/api/assistant`

Endpoint :

| Méthode | Route | Auth | Controller |
|---|---|---|---|
| POST | `/chat` | Oui | `chatWithAssistant` |

### Routes supprimées ou non trouvées

- `/api/trends` : Non trouvé dans le projet.
- `/api/feed/repair-media` : Non trouvé dans le projet.
- endpoint ElevenLabs : Non trouvé dans le projet.
- endpoint wake word backend : Non trouvé dans le projet.

## 9. Authentification et cycle utilisateur

### Inscription

Frontend :

- `frontend/src/pages/Signup.jsx`
- envoie `POST /users/signup`
- champs :
  - `name`
  - `email`
  - `password`

Backend :

- `backend/controllers/userController.js`
- `registerUser`

Étapes :

1. Trim du nom et email.
2. Email mis en lowercase.
3. Validation :
   - nom entre 2 et 50 caractères ;
   - email au format email ;
   - mot de passe entre 8 et 128 caractères.
4. Vérification existence email.
5. Hash bcrypt avec salt 10.
6. Création User.
7. Réponse sans token :
   - `message`
   - `user`

Après inscription :

- `Signup.jsx` redirige vers `/login`.

### Connexion

Frontend :

- `frontend/src/pages/Login.jsx`
- envoie `POST /users/login`
- reçoit `token` et `user`
- appelle `AuthContext.login(data.user, data.token)`
- redirige vers `/home`

Backend :

- `loginUser`

Étapes :

1. Trim email.
2. Email en lowercase.
3. Validation email et longueur mot de passe.
4. Recherche user.
5. Comparaison bcrypt.
6. Génération JWT :
   - payload `{ id }`
   - secret `JWT_SECRET`
   - expiration `JWT_EXPIRATION`
7. Réponse :
   - `message`
   - `token`
   - `user`

### Session frontend

Fichier : `frontend/src/context/AuthContext.jsx`

Comportement :

- au montage :
  - lit `localStorage.token`;
  - si token existe, appelle `/users/profile`;
  - met `user`;
  - sinon supprime token en cas d'erreur ;
  - rend les enfants seulement après `loading=false`.

Fonction `login` :

- stocke le token dans `localStorage`;
- appelle `/users/profile`;
- utilise les données profil si disponibles ;
- fallback sur `userData`.

Fonction `logout` :

- supprime token localStorage ;
- met `user` à null.

Fonction `updateUser` :

- merge des updates dans le user courant.

### Routes protégées frontend

Fichier : `frontend/src/components/PrivateRoute.jsx`

Comportement :

- si `loading` : affiche `Chargement...`
- si `user` existe : affiche children
- sinon : redirige vers `/login`

## 10. Préférences utilisateur

### Stockage MongoDB

Champ :

- `User.preferences`
- type `[String]`

### Frontend profil

Fichier : `frontend/src/pages/Profile.jsx`

Catégories de préférences affichées :

- `tech` : Technologie
- `gaming` : Gaming
- `business` : Business
- `education` : Education
- `health` : Sante
- `society` : Societe
- `startup` : Startup
- `creator` : Createurs

Actions :

- clic sur une carte : ajoute/retire l'id de préférence ;
- bouton `Tout selectionner` : sélectionne toutes les catégories ;
- bouton `Enregistrer les preferences` :
  - appelle `PUT /users/preferences`;
  - met à jour `AuthContext.user.preferences` via `updateUser`.

### Backend préférences

Controller :

- `updatePreferences`

Validation :

- `preferences` doit être un tableau ;
- chaque élément doit être string ;
- trim ;
- longueur max 50 ;
- limite 20 préférences ;
- au moins un élément valide.

Réponse :

- `message: "Preferences updated"`
- `preferences`

### Mapping vers le feed

Fichier : `backend/controllers/feedController.js`

Mapping :

- `tech` -> `tech`, `ia`
- `gaming` -> `gaming`
- `business` -> `business`
- `education` -> `education`
- `health` -> `health`
- `society` -> `social`, `news`
- `startup` -> `startups`
- `creator` -> `creators`, `social`

Fonction :

- `buildPersonalizationProfile(preferences)`

Comportement :

- si aucune préférence active reconnue :
  - `personalized: false`
- sinon :
  - `personalized: true`
  - `activePreferences`
  - `allowedCategories`
  - `categoryKeys`

Le feed utilise les préférences comme filtre strict quand aucun filtre catégorie explicite n'est actif.

## 11. Feed

### Frontend Explorer

Fichier : `frontend/src/pages/Feed.jsx`

Route frontend :

- `/feed`

États principaux :

- `baseData`
- `hidden`
- `saved`
- `savedItems`
- `categoryFilter`
- `sortMode`
- `loading`
- `loadingMore`
- `meta`
- `toast`
- `drawerOpen`

Paramètres envoyés à `/api/feed` :

- `page`
- `limit`
- `sort`
  - `score` si `sortMode === 'score'`
  - `newest` sinon
- `seen`
- `category` si filtre différent de `all`

Taille de page frontend :

- `PAGE_SIZE = 24`

Catégories visibles Explorer :

- Football
- Gaming
- IA
- Business
- Crypto
- Créateurs
- Réseaux Sociaux
- Actualités
- Santé
- Éducation
- Tech
- Science
- Startups

Tri visible :

- `Récents`
- `Top score`

Chargement suivant :

- bouton `Charger plus`
- `IntersectionObserver` sur `loaderRef`
- pas de timer automatique dans le code actuel de `Feed.jsx`.

Mix frontend :

- `applyFeedMix`
- conserve l'ordre pour `sortMode === 'recent'` ou `meta.page > 1`.
- applique un mélange basé sur fraîcheur, unseenBoost et facteur hash/random quand l'ordre n'est pas préservé.

### Backend feed

Controller :

- `getFeed`

Paramètres acceptés :

- `refresh`
- `page`
- `limit`
- `sort`
- `category`
- `source`
- `viral`
- `seen`

Limite backend :

- `clampFeedLimit`
- défaut : `12`
- maximum : `100`

Recherche catégorie sémantique :

- `FEED_CATEGORY_MAPPING`
- matching sur :
  - `title`
  - `category`
  - `excerpt`
  - `link`
  - `tags`

Scan catégorie :

- `CATEGORY_SCAN_LIMIT = 700`

Modes du feed :

1. Si catégorie sémantique ou personnalisation et pas `forceRefresh` :
   - construit une requête Mongo avec regex sur les termes ;
   - charge jusqu'à 700 tendances ;
   - filtre sémantiquement côté Node ;
   - trie par score ou date ;
   - pagine après filtrage.

2. Sinon :
   - appelle `getFeedTrends`.

3. Si pas de tendances stockées ou `forceRefresh` :
   - appelle `getRealTrends`;
   - score via `scoreTrends`;
   - prédit via `predictTrend`;
   - persiste via `saveTrends`;
   - filtre/pagine.

Meta réponse :

- `total`
- `page`
- `limit`
- `totalPages`
- `hasMore`
- `personalized`
- `activePreferences`
- parfois :
  - `categoryFilter`
  - `categoryLabel`
  - `categoryTerms`
  - `preferenceCategoryKeys`

Chaque item feed contient :

- `id`
- `_id`
- `title`
- `score`
- `source`
- `category`
- `credibilityScore`
- `credibilityConfidence`
- `verificationStatus`
- `isFakeNews`
- `popularity`
- `growth`
- `image`
- `video`
- `thumbnail`
- `mediaType`
- `link`
- `ml_prediction`
- `createdAt`
- `savedCount`
- `isSaved`

## 12. Recherche

### Frontend recherche

Fichier : `frontend/src/pages/SearchPage.jsx`

Route :

- `/search`

État :

- `query`
- `recent`
- `results`
- `loading`
- `error`

Sources des recherches récentes :

- `localStorage`
- clé `trendify_recent_searches`

Suggestions par défaut :

- `GTA 6`
- `OpenAI`
- `Gaming`
- `Startup IA`
- `Google Trends`

Appel API :

- `GET /feed/search`
- params :
  - `q`
  - `limit: 50`

Debounce :

- `250 ms`

### Backend recherche

Controller :

- `searchTrends`

Limite :

- `clampSearchLimit`
- défaut : `20`
- max : `50`

Scan :

- `SEARCH_SCAN_LIMIT = 500`

Champs recherchés :

- `title`
- `tags`
- `category`
- `excerpt`
- `link`

Ranking :

- fonction `calculateSearchRelevance`
- poids :
  - match exact title : +100
  - title contient query : +70
  - tags : +45
  - category : +35
  - excerpt : +28
  - link : +20
  - mots partiels pondérés.

Tri final :

1. `searchRelevance` décroissant
2. `score` décroissant

## 13. Favoris

### Backend

Controllers :

- `saveTrend`
- `unsaveTrend`
- `getSavedTrends`

Stockage :

- `User.savedTrends`
- tableau d'ObjectId `Trend`

Sauvegarde :

- vérifie que l'id est ObjectId valide ;
- vérifie que la tendance existe ;
- utilise `$addToSet`;
- incrémente `Trend.savedCount`.

Retrait :

- utilise `$pull`;
- décrémente `savedCount` si > 0.

Liste :

- récupère user ;
- charge les trends `$in: ids` ;
- préserve l'ordre des IDs sauvegardés.

### Frontend

Fichiers :

- `frontend/src/pages/Favorites.jsx`
- `frontend/src/pages/Feed.jsx`
- `frontend/src/pages/TrendDetail.jsx`

Fonctions :

- ajout/retrait depuis feed ;
- drawer `Sauvegardés` dans Explorer ;
- page dédiée `/favorites` ;
- retrait depuis page favoris ;
- recherche locale dans les favoris ;
- filtre local par source :
  - Tous
  - Reddit
  - Google Trends

## 14. Cycle de vie complet d'une tendance

### 1. Collecte

Service central :

- `backend/services/data/index.js`

Sources :

- `getGoogleTrends`
- `getRedditTrends`

Collecte en parallèle :

- `Promise.allSettled`

Gestion d'échec :

- chaque source échouée retourne bucket vide avec log warning ;
- si aucun bucket valide, erreur `503`.

### 2. Fusion et déduplication initiale

Fonction :

- `interleaveSourceBuckets`

Processus :

- prend les buckets sources ;
- alterne les tendances entre sources ;
- normalise le titre en clé ;
- évite les doublons de titre ;
- limite à `MAX_TRENDS`.

Cache mémoire :

- variable module `cache`
- champs :
  - `data`
  - `timestamp`
- durée :
  - `TREND_CACHE_DURATION_MS`
  - défaut 10 minutes

### 3. Nettoyage

Fichier :

- `backend/services/data/cleaner.js`

Fonctions :

- `cleanTitle`
- `isGoodContent`
- `validateTrend`
- `estimateSentimentScore`

Nettoyage titre :

- supprime les crochets `[...]`
- supprime caractères non alphanumériques
- trim
- normalise espaces

Filtre contenu :

- refuse les titres contenant :
  - `sexual`
  - `kill`
  - `murder`
  - `graphic`
  - `violence`
  - `suicide`
  - `terrorist`

Validation trend :

- exige :
  - `title` string
  - `popularity` number
  - `growth` number
  - `source` string
  - `link` string

### 4. Enrichissement Reddit

Fichier :

- `backend/services/data/redditService.js`

Pour chaque post :

- titre nettoyé ;
- titre minimum 12 caractères ;
- contenu non interdit ;
- déduplication par titre normalisé ;
- `popularity = score`
- `growth = num_comments`
- `source = Reddit`
- `link = https://reddit.com<permalink>`
- média via `extractFromReddit`
- `num_comments`
- `post_length`
- `hour`
- `title_length`
- `sentiment`
- `tags = [subreddit, flair]`
- `excerpt = selftext` tronqué ou titre
- `source_detail = subreddit`
- features ML via `generateMlFeatures`

Tri Reddit :

- score interne :
  - `popularity * 0.65 + growth * 0.25 + num_comments * 0.1`

### 5. Enrichissement Google Trends

Fichier :

- `backend/services/data/googleTrendsService.js`

Pour chaque tendance SerpAPI :

- `title`
- `popularity`
- `growth`
- `source = Google Trends`
- `link = https://trends.google.com/trends/explore?q=<query>`
- `rawQuery`
- `searchVolume`
- `deltaValue`
- `sentiment`
- `tags`
- `excerpt = Search interest is rising...`

Geo interest :

- ajouté par `enrichWithGeoInterest` jusqu'à `GOOGLE_TRENDS_GEO_LIMIT`.
- défaut : `20`.
- si indisponible ou timeout : `[]`.

### 6. Scoring

Fichier :

- `backend/services/trendService.js`

Fonction :

- `scoreTrends`

Normalisations :

- `normalizeSource`
- `normalizeCategory`

Catégorisation automatique :

- règles `CATEGORY_KEYWORDS`
- catégories possibles :
  - `AI`
  - `Startups`
  - `Tech`
  - `Gaming`
  - `Business`
  - `Finance`
  - `Social`
  - `Science`
  - `Entertainment`
  - `Web culture`
- fallback :
  - Reddit -> `Discussion`
  - Google Trends -> `Search Trends`
  - YouTube -> `Video`
  - Twitter/TikTok -> `Social`
  - sinon `General`

Formule documentée dans `scoreDetails.formula` :

```text
18 + 22*log(popularity) + 28*momentum + 10*recency + 10*sourceConfidence + 8*sentiment + 7*uniqueness
```

Score clampé :

- minimum 35
- maximum 95

Composants :

- `popularityFactor`
- `growthFactor`
- `engagementFactor`
- `momentumFactor`
- `recency`
- `sourceConfidence`
- `sentimentFactor`
- `uniquenessFactor`
- `categoryBalance`
- `sourceBalance`

### 7. Crédibilité

Fichier :

- `backend/services/credibilityService.js`

Fonction :

- `evaluateTrendCredibility`

Sources éditoriales de confiance listées :

- Reuters
- Associated Press
- BBC
- The Verge
- TechCrunch
- Wired
- Nature
- NIH
- WHO
- SEC
- NASA
- GameSpot
- IGN
- Polygon

Baselines :

- Google Trends :
  - score 68
  - confidence medium
  - status partially_verified
- Reddit :
  - score 46
  - confidence low
  - status unverified

Détection de risque :

- motifs high risk :
  - fake
  - hoax
  - scam
  - fraud
  - conspiracy
  - deepfake
  - misinformation
  - rumor / rumour
  - leaked
  - unverified
  - 100% true
  - shocking proof
  - doctors hate
  - secret cure
  - guaranteed
- motifs sensationnalistes :
  - shocking
  - exposed
  - you won't believe
  - insane
  - destroyed
  - panic
  - collapse
  - `!!`

Sortie :

- `credibilityScore`
- `confidence`
- `verifiedSources`
- `verificationStatus`
- `explanation`
- `isFakeNews`
- `signals`

### 8. Persistance

Fichier :

- `backend/services/trendService.js`

Fonction :

- `saveTrends`

Processus :

- chunks de 100 ;
- normalise source ;
- normalise catégorie ;
- construit `slug` ;
- normalise médias ;
- calcule `mediaFingerprint`;
- génère features ML si Reddit ;
- appelle `predictTrend` si besoin ;
- évalue crédibilité ;
- normalise geoInterest ;
- upsert Mongo via `Trend.findOneAndUpdate({ slug }, { $set, $setOnInsert }, { upsert: true })`.

Déduplication persistante :

- champ `slug` unique.

### 9. Lecture

Les tendances sont ensuite utilisées par :

- `/api/feed`
- `/api/feed/search`
- `/api/feed/:id`
- `/api/feed/:id/analyze`
- `/api/assistant/chat`
- `/api/users/saved-trends`

## 15. Feed personnalisé

Le feed personnalisé est implémenté comme filtrage strict, pas comme modification du score.

Preuves :

- `buildPersonalizationProfile` construit des catégories autorisées.
- `getFeed` applique `filterTrendsByAnyFeedCategory`.
- La réponse contient `personalized` et `activePreferences`.
- Aucun champ `personalizedScore` n'est retourné dans `getFeed`.

Quand un filtre catégorie explicite est actif :

- `applyPersonalization` devient faux car `explicitCategoryFilterActive` est vrai.

Quand aucune préférence reconnue :

- feed normal.

## 16. Google Trends geo map

### Backend

Fichiers :

- `backend/services/data/googleTrendsService.js`
- `backend/controllers/feedController.js`
- `backend/models/Trend.js`

Donnée stockée :

```json
geoInterest: [
  {
    "country": "United States",
    "countryCode": "US",
    "value": 100
  }
]
```

Collecte :

- au moment de `getGoogleTrends`, selon `GOOGLE_TRENDS_GEO_LIMIT`;
- à la demande dans `getTrendDetail` si source Google et `geoInterest` vide.

Fonction à la demande :

- `resolveGoogleTrendsGeoInterest`

Critère :

- source contient `google`;
- `geoInterest` absent ou vide.

Query :

- `extractGoogleTrendsQuery(trend.link)` ou `trend.title`.

Persistance à la demande :

- si geoInterest non vide :
  - `Trend.findByIdAndUpdate(... { $set: { geoInterest, updatedAt }})`

### Frontend

Fichier :

- `frontend/src/pages/TrendDetail.jsx`

Composant :

- `GeoInterestSection`

Bibliothèque :

- `react-svg-worldmap`

Comportements :

- source non Google :
  - affiche message indiquant que les données géographiques ne sont pas disponibles pour cette source.
- source Google sans données :
  - affiche message indiquant qu'aucune donnée géographique Google Trends n'est encore disponible.
- source Google avec données :
  - affiche carte monde ;
  - affiche top 10 pays.

## 17. IA : rapports d'analyse

### Backend

Fichier :

- `backend/services/aiService.js`

Provider réel :

- Groq.

OpenRouter :

- Non trouvé dans le runtime actuel.

Fonction exportée :

- `generateTrendAnalysis`
- `createAiUnavailableError`

Endpoint externe :

- `https://api.groq.com/openai/v1/chat/completions`

Timeout :

- `15000 ms`

Modèle :

- `process.env.GROQ_MODEL || "llama-3.3-70b-versatile"`

Max tokens :

- `1300`

Température :

- `0.16`

Format demandé :

- `response_format: { type: "json_object" }`

Clés JSON attendues :

- `summary`
- `whyItMatters`
- `whyTrendRises`
- `targetAudience`
- `marketAnalysis`
- `opportunity`
- `risks`
- `confidence`
- `confidenceReason`
- `recommendations`
- `businessOpportunities`
- `contentIdeas`
- `conclusion`

Validation :

- chaque champ texte principal doit exister ;
- les listes `risks`, `recommendations`, `businessOpportunities`, `contentIdeas` doivent être non vides.

Mode d'échec :

- si clé Groq absente ou erreur :
  - erreur `503`
  - status `ai_unavailable`
  - message par défaut `Analyse temporairement indisponible.`

Fallback local de rapport IA :

- Non trouvé dans le runtime actuel.

Stockage permanent des analyses IA :

- Non trouvé dans `analyzeTrend`.
- `analyzeTrend` retourne l'analyse mais ne la sauvegarde pas dans `Trend`.

### API analyse

Endpoint :

- `POST /api/feed/:id/analyze`

Controller :

- `analyzeTrend`

Étapes :

1. Valide ObjectId.
2. Charge la tendance via `getTrendById`.
3. Vérifie quota `aiRemaining`.
4. Réserve le quota via `User.findOneAndUpdate` avec `$inc: -1`.
5. Appelle `generateTrendAnalysis`.
6. Si erreur IA :
   - rembourse le quota via `$inc: +1`.
7. Si analyse status différent de `groq` :
   - rembourse le quota.
8. Répond avec :
   - `trend`
   - `analysis`
   - `aiRemaining`

### Frontend rapport IA

Fichier :

- `frontend/src/pages/AIWorkspace.jsx`

Route :

- `/ai/:id`

Comportement :

1. Charge le détail :
   - `GET /feed/:id`
2. Lance l'analyse :
   - `POST /feed/:id/analyze`
3. Affiche un loader premium avec progression simulée.
4. Attend au minimum `MIN_REPORT_LOADING_MS = 5500`.
5. Passe à 100% quand analyse complète.
6. Affiche le rapport.

Sections affichées :

- Rapport d'analyse
- Résumé exécutif
- Pourquoi cette tendance monte
- Public cible concerné
- Opportunité business
- Risques
- Niveau de confiance
- Recommandations
- Idées business
- Idées de contenu
- Conclusion stratégique

Message d'erreur IA :

- titre `Analyse indisponible`
- texte si `ai_unavailable` :
  - `Le moteur IA est actuellement inaccessible. Veuillez réessayer ultérieurement.`

## 18. Assistant IA Trendi

### Backend Trendi

Fichier :

- `backend/services/assistantService.js`

Controller :

- `backend/controllers/assistantController.js`

Route :

- `POST /api/assistant/chat`

Entrée :

```json
{
  "message": "...",
  "context": {}
}
```

Sortie controller :

```json
{
  "success": true,
  "data": {
    "answer": "...",
    "status": "...",
    "trendsUsed": 0,
    "trends": [],
    "action": null,
    "pendingAction": null,
    "intent": "...",
    "confidence": null
  }
}
```

### Classification d'intention

Fonction :

- `classifyAssistantIntent`

Catégories trouvées :

- `empty`
- `confirmation`
- `conversation`
- `help`
- `search`
- `theme`
- `preferences`
- `analysis`
- `navigation`
- `advice`
- `trend_search`

Conversation simple reconnue :

- salut
- bonjour
- bonsoir
- coucou
- hello
- hi
- salam
- merci
- ok
- super
- parfait
- ça marche
- au revoir
- comment vas-tu
- qui es-tu

Actions structurées :

- `navigate`
- `theme`
- `filter`
- `search`
- `open_trend`
- `analyze`

### Navigation Trendi

Mapping backend :

- Accueil -> `/home`
- Explorer -> `/feed`
- Favoris -> `/favorites`
- Profil -> `/profile`
- Préférences -> `/profile`
- Recherche -> `/search`

### Thème Trendi

Cibles :

- `dark`
- `light`

Expressions reconnues :

- mode sombre
- thème sombre
- thème noir
- interface sombre
- mode noir
- site en noir
- dark mode
- mode clair
- thème clair
- interface claire
- light mode

### Filtres Trendi

Préférences reconnues :

- `gaming`
- `business`
- `tech`
- `startup`
- `health`
- `society`
- `creator`
- `education`

Action frontend :

- `applyPreferenceCommand`
- appelle `PUT /users/preferences` avec une seule préférence ;
- met à jour AuthContext ;
- navigue vers `/feed`.

### Recherche Trendi

Action :

- `search`

Frontend :

- navigue vers `/search?q=<target>`.

### Ouverture et analyse de tendance via Trendi

Actions :

- `open_trend`
- `analyze`

Source de l'id :

- `action.target`
- ou `lastActionableTrend` côté frontend.

Navigation :

- open_trend -> `/feed/:id`
- analyze -> `/ai/:id`

### Contexte de tendances pour Trendi

Fonction :

- `getTopTrendContext`

Si sujet détecté :

- construit query Mongo sur :
  - `title`
  - `category`
  - `tags`
- limite brute :
  - `RELEVANT_CONTEXT_LIMIT = 40`
- rank via `calculateTrendRelevance`
- garde `MAX_CONTEXT_TRENDS = 20`

Si pas de sujet :

- prend top tendances par score.

Cartes retournées :

- `trends.map(formatActionableTrend).slice(0, 3)`

### Aliases de sujets Trendi

Présents dans `TOPIC_ALIASES` :

- `ia`
- `ai`
- `gaming`
- `game`
- `sante`
- `santé`
- `health`
- `sport`
- `football`
- `soccer`
- `fifa`
- `uefa`
- `business`
- `startup`
- `crypto`
- `technologie`
- `tech`

### Appel Groq Trendi

Fonction :

- `requestAssistantAnswer`

Endpoint :

- `https://api.groq.com/openai/v1/chat/completions`

Timeout :

- `15000 ms`

Max tokens :

- `520`

Température :

- `0.18`

Prompt système :

- Trendi doit parler court, direct, humain.
- Réponse en français.
- Ne pas mentionner MongoDB, OpenRouter, Groq, API, backend, collection, base de données, système, contexte, score.
- 3 à 8 phrases maximum.
- Si mode conseil business :
  - ne pas effectuer une recherche exacte ;
  - repérer les domaines prometteurs dans les tendances fournies.

### Frontend Trendi

Fichier :

- `frontend/src/components/AssistantWidget.jsx`

Visible uniquement si :

- `user` existe ;
- route courante n'est pas `/`, `/login`, `/signup`.

Stockage local conversation :

- clé `trendi-conversation`
- conserve les 20 derniers messages.

Fonctions vocales :

- `SpeechRecognition` ou `webkitSpeechRecognition`
- `speechSynthesis`
- `SpeechSynthesisUtterance`

Mode vocal :

- overlay modal ;
- orbe animé ;
- écoute continue pendant le mode vocal ;
- bouton fermeture X ;
- bouton micro.

Paramètres SpeechRecognition :

- `lang = 'fr-FR'`
- `continuous = true`
- `interimResults = true`
- `maxAlternatives = 1`

Lecture vocale :

- fonction `speak`
- nettoie le markdown via `sanitizeForSpeech`
- sélectionne une voix française via `getBestFrenchVoice`
- priorité :
  - Microsoft Henri
  - Microsoft Paul
  - Thomas
  - Rémy / Remy
  - French Male
  - voix française masculine
  - voix française
  - première voix disponible

Wake word `Ok Trendi` :

- Non trouvé dans le composant actuel.

ElevenLabs :

- Non trouvé dans le composant actuel.

## 19. Pipeline ML

### Dossier

Chemin :

- `ml-model/`

Fichiers :

- `app.py`
- `predict.py`
- `train.py`
- `requirements.txt`
- `Dockerfile`
- `data/trends_dataset.csv`
- `data/Redit_data.csv`
- `models/trend_predictor.pkl`

### Dépendances Python

Fichier :

- `ml-model/requirements.txt`

Packages :

- `Flask==3.0.0`
- `pandas==2.2.3`
- `scikit-learn==1.4.2`
- `joblib==1.4.1`

### `app.py`

Rôle :

- crée une app Flask ;
- charge `models/trend_predictor.pkl`;
- expose `/predict`.

Endpoint :

- `POST /predict`

Déclaration route :

- `@app.route("/predict", methods=["POST"])` apparaît deux fois dans le fichier.

Champs requis :

- `num_comments`
- `post_length`
- `hour`
- `title_length`
- `sentiment`

Réponse succès :

```json
{
  "prediction": 0
}
```

Port dans `app.py` si lancé directement :

- `5000`

### `Dockerfile` ML

Port exposé :

- `5001`

Commande :

- `flask run`

Variables :

- `FLASK_APP=app.py`
- `FLASK_RUN_HOST=0.0.0.0`
- `FLASK_RUN_PORT=5001`

Différence factuelle :

- `app.py` lance `app.run(port=5000)` en mode direct.
- Docker lance Flask sur `5001`.

### `train.py`

Rôle :

- charge `data/Redit_data.csv`;
- utilise les features :
  - `num_comments`
  - `post_length`
  - `hour`
  - `title_length`
  - `sentiment`
- label :
  - `viral`
- split train/test :
  - `test_size=0.2`
  - `random_state=42`
  - `stratify=y`

Modèles entraînés / comparés :

- LogisticRegression
- XGBClassifier
- RandomForestClassifier dans un Pipeline avec StandardScaler

GridSearch RandomForest :

- `n_estimators`: 50, 100, 200
- `max_depth`: None, 5, 10
- `cv=3`
- `scoring="f1"`

Sauvegarde :

- `models/trend_predictor.pkl`

### `predict.py`

Rôle :

- charge le modèle pkl ;
- crée une tendance d'exemple ;
- affiche `Prediction:`.

### Dataset ML

Fichiers :

- `ml-model/data/trends_dataset.csv`
  - 11 lignes observées avec header inclus.
  - colonnes :
    - `reddit_score`
    - `comments_count`
    - `google_trend_score`
    - `engagement_rate`
    - `growth_rate`
    - `sentiment_score`
    - `final_label`

- `ml-model/data/Redit_data.csv`
  - 2988 lignes observées avec header inclus.
  - colonnes :
    - `title`
    - `upvotes`
    - `num_comments`
    - `created_utc`
    - `subreddit`
    - `post_type`
    - `post_length`
    - `viral`
    - `hour`
    - `day_of_week`
    - `title_length`
    - `sentiment`

### Intégration Node <-> Python

Recherche dans le backend :

- aucun appel HTTP vers `ml-model` trouvé ;
- aucun appel à `/predict` depuis Node trouvé ;
- aucun usage de Flask runtime depuis Express trouvé.

État réel :

- le dossier `ml-model` existe ;
- le backend actuel utilise `backend/services/mlService.js`;
- `mlService.js` utilise `potentialClassifier.js`, pas le serveur Flask.

### ML runtime backend réel

Fichiers :

- `backend/services/mlService.js`
- `backend/services/potentialClassifier.js`

Comportement :

- `predictTrend(trend)` vérifie que `trend.score` est un nombre ;
- si score invalide :
  - `UNAVAILABLE`
- sinon :
  - appelle `classifyTrendPotential`.

Seuil :

- `HIGH` si `score >= 70`
- `LOW` sinon

Retour :

- `classification`
- `confidence`
- `reasoning`
- `explanation`

## 20. Système de crédibilité et fake news

### Fichier

- `backend/services/credibilityService.js`

### Objectif réel dans le code

Le service évalue un score de crédibilité à partir :

- du domaine du lien ;
- de la source ;
- de motifs textuels à risque ;
- de motifs sensationnalistes.

### Sources vérifiées

Le système ne marque `verified` que si le lien pointe vers un domaine de la liste `TRUSTED_DOMAINS` et sans high-risk marker.

### Fake news

Condition :

- pas de source de confiance ;
- au moins un high-risk marker ;
- `credibilityScore < 35`.

### Sortie stockée dans MongoDB

La sortie est persistée dans `saveTrends` :

- `credibilityScore`
- `credibilityConfidence`
- `verificationStatus`
- `verifiedSources`
- `credibilityExplanation`
- `isFakeNews`
- `credibilitySignals`

## 21. Sécurité

### Mesures présentes

Backend :

- `helmet`
- `cors`
- `express-rate-limit`
- `express-mongo-sanitize`
- JSON body limit `10kb`
- URL encoded body limit `10kb`
- JWT sur routes privées
- bcrypt pour hash password
- validation email/name/password
- validation ObjectId sur routes trend id
- error middleware sans stack hors développement
- `.env` ignoré par Git

### CORS

Origine :

- `FRONTEND_URL`

Méthodes :

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `OPTIONS`

Headers :

- `Content-Type`
- `Authorization`

### Rate limiting

Global :

- fenêtre 15 min
- max `RATE_LIMIT_MAX || 600`

Auth :

- fenêtre 15 min
- max `AUTH_RATE_LIMIT_MAX || 30`

### Secrets

Variables sensibles utilisées :

- `MONGO_URI`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `SERPAPI_KEY`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_PASSWORD`

Valeurs des secrets :

- Non incluses dans ce rapport.

## 22. Logs

### Logger

Fichier :

- `backend/utils/logger.js`

Fonctionnement :

- `info` et `warn` s'affichent seulement si :
  - `DEBUG_LOGS === 'true'`
  - ou `NODE_ENV !== 'production'`
- `error` utilise toujours `console.error`.

### Logs frontend

Fichiers :

- `frontend/src/api/axios.js`
- `frontend/src/components/AssistantWidget.jsx`

Comportement :

- logs conditionnés par `import.meta.env.DEV`.

## 23. Déploiement et Docker

### Docker Compose

Fichier :

- `docker-compose.yml`

Services :

- `mongo`
- `backend`
- `frontend`

Service `mongo` :

- image `mongo:6.0`
- port `27017:27017`
- volume `mongo_data`
- database initiale `trend_predictor`

Service `backend` :

- build `./backend`
- dépend de `mongo`
- port `5000:5000`
- env :
  - `PORT=5000`
  - `MONGO_URI=mongodb://mongo:27017/trend_predictor`
  - `JWT_SECRET`
  - `GROQ_API_KEY`
  - `GROQ_MODEL`
  - `SERPAPI_KEY`
  - `NODE_ENV=production`

Service `frontend` :

- build `./frontend`
- dépend de `backend`
- port `4173:4173`

Service ML dans docker-compose :

- Non trouvé dans le projet.

### Backend Dockerfile

Fichier :

- `backend/Dockerfile`

Base :

- `node:20-alpine`

Commande :

- `node server.js`

Port :

- `5000`

### Frontend Dockerfile

Fichier :

- `frontend/Dockerfile`

Base :

- `node:20-alpine`

Commande :

- `npm run preview -- --host 0.0.0.0 --port 4173`

Port :

- `4173`

### ML Dockerfile

Fichier :

- `ml-model/Dockerfile`

Base :

- `python:3.12-slim`

Commande :

- `flask run`

Port :

- `5001`

### Render

Fichier `render.yaml` :

- Non trouvé dans le projet.

### Vercel

Fichier `vercel.json` :

- Non trouvé dans le projet.

## 24. Frontend

### Stack frontend

Fichier :

- `frontend/package.json`

Dépendances :

- `@tailwindcss/postcss`
- `axios`
- `lucide-react`
- `react`
- `react-dom`
- `react-router-dom`
- `react-svg-worldmap`
- `three`

Dev dependencies :

- `@eslint/js`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react`
- `autoprefixer`
- `eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `postcss`
- `tailwindcss`
- `vite`

### Routes frontend

Fichier :

- `frontend/src/App.jsx`

Routes :

| Route | Protection | Page |
|---|---|---|
| `/` | publique | LandingPage |
| `/login` | publique | Login |
| `/signup` | publique | Signup |
| `/home` | privée | Home |
| `/profile` | privée | Profile |
| `/favorites` | privée | Favorites |
| `/search` | privée | SearchPage |
| `/preferences` | privée | Navigate vers `/profile` |
| `/dashboard` | privée | Navigate vers `/home` |
| `/feed` | privée | Feed |
| `/feed/:id` | privée | TrendDetail |
| `/ai/:id` | privée | AIWorkspace |
| `*` | publique | Navigate vers `/` |

### Layout global

Composants globaux dans `App.jsx` :

- `ThemeProvider`
- `AuthProvider`
- `Router`
- `Ambient3DBackground`
- `Routes`
- `AssistantWidget`

### Pages

#### LandingPage

Fichier :

- `frontend/src/pages/LandingPage.jsx`

Contenu :

- Navbar publique.
- Hero marketing.
- Preview de trois cartes statiques :
  - Reddit / Gaming
  - Google Trends / Santé
  - Reddit / Business
- Section fonctionnalités :
  - Flux personnalisé
  - Scores lisibles
  - Rapports propres
  - Sauvegarde rapide
- CTA vers signup.

#### Login

Fichier :

- `frontend/src/pages/Login.jsx`

Fonction :

- formulaire email/password ;
- appelle `/users/login` ;
- appelle `AuthContext.login`;
- redirige vers `/home`.

#### Signup

Fichier :

- `frontend/src/pages/Signup.jsx`

Fonction :

- formulaire name/email/password ;
- appelle `/users/signup` ;
- redirige vers `/login`.

#### Home

Fichier :

- `frontend/src/pages/Home.jsx`

Fonction :

- appelle `/feed?page=1&limit=8` ;
- trie localement les tendances par score ;
- affiche top 4 ;
- affiche raccourcis vers :
  - Explorer
  - Recherche
  - Favoris
  - Profil
- affiche mini carte profil.

#### Feed / Explorer

Fichier :

- `frontend/src/pages/Feed.jsx`

Décrit en section Feed.

#### SearchPage

Fichier :

- `frontend/src/pages/SearchPage.jsx`

Décrit en section Recherche.

#### Favorites

Fichier :

- `frontend/src/pages/Favorites.jsx`

Décrit en section Favoris.

#### Profile

Fichier :

- `frontend/src/pages/Profile.jsx`

Décrit en section Préférences.

Inclut aussi :

- nom utilisateur ;
- email ;
- analyses restantes ;
- nombre de préférences ;
- état thème ;
- toggle thème clair/sombre.

#### TrendDetail

Fichier :

- `frontend/src/pages/TrendDetail.jsx`

Fonction :

- charge `/feed/:id`;
- affiche titre ;
- résumé si disponible ;
- actions :
  - retour au flux ;
  - voir la source ;
  - ouvrir le rapport ;
  - sauvegarder/retirer ;
- média si disponible ;
- pills source/tags ;
- cartes :
  - Impact
  - Momentum
  - Enregistrement
- section Google Trends geo ;
- sidebar rapport ;
- fiche rapide ;
- tendances liées.

#### AIWorkspace

Fichier :

- `frontend/src/pages/AIWorkspace.jsx`

Décrit en section IA.

### Composants communs

#### Navbar

Fichier :

- `frontend/src/components/Navbar.jsx`

Modes :

- public si pas user ;
- sidebar desktop si user ;
- topbar mobile si user ;
- dock mobile si user.

Navigation connectée :

- Accueil
- Explorer
- Recherche
- Favoris
- Profil

#### AssistantWidget

Fichier :

- `frontend/src/components/AssistantWidget.jsx`

Décrit en section Trendi.

#### Ambient3DBackground

Fichier :

- `frontend/src/components/Ambient3DBackground.jsx`

Technologie :

- Three.js

Objets :

- Icosahedron
- Sphere
- TorusKnot
- Sphere

Rendu :

- WebGLRenderer alpha true ;
- antialias true ;
- powerPreference low-power ;
- pixelRatio max 1.5 ;
- animation requestAnimationFrame ;
- respecte `prefers-reduced-motion`.

#### MediaBox

Fichier :

- `frontend/src/components/MediaBox.jsx`

Fonction :

- affiche image ou vidéo ;
- pas de placeholder générique ;
- retourne `null` si pas de média utilisable ;
- ratios :
  - `16:9`
  - `3:2`
  - `square`

#### Button

Fichier :

- `frontend/src/components/Button.jsx`

Variants :

- primary
- ghost
- destructive
- secondary

Support :

- bouton standard ;
- lien `<a>` si `href`.

#### Input

Fichier :

- `frontend/src/components/Input.jsx`

Fonction :

- input avec label optionnel ;
- icône optionnelle ;
- helper/error ;
- aria invalid/describedby.

#### EmptyState

Fichier :

- `frontend/src/components/EmptyState.jsx`

Fonction :

- état vide avec icône, titre, sous-titre, action.

#### LoadingSkeleton

Fichier :

- `frontend/src/components/LoadingSkeleton.jsx`

Fonction :

- bloc skeleton simple en gradient.

## 25. UX/UI et styles

### Fichiers styles

- `frontend/src/index.css`
- `frontend/src/App.css`

`index.css` contient 5795 lignes observées.

### Thème

Fichier :

- `frontend/src/context/ThemeContext.jsx`

Comportement :

- stocke `theme` dans localStorage ;
- applique `data-theme` sur `document.documentElement`;
- `dark` si localStorage `theme === 'dark'`.

### Background

Le background 3D est toujours monté via `Ambient3DBackground` dans `App.jsx`.

### Logo

Fichier :

- `frontend/public/brand/trendify-logo.png`

Utilisé dans :

- Navbar ;
- Login ;
- Signup ;
- Manifest ;
- Favicon HTML.

### Responsive

Preuves CSS :

- media queries dans `frontend/src/index.css`;
- sidebar desktop cachée sous mobile ;
- dock mobile affiché sous mobile ;
- grille feed responsive ;
- sections profil/favoris/home en une colonne sous breakpoints.

## 26. Nettoyage média

Pipeline média externe :

- Openverse : Non trouvé dans le projet.
- Wikimedia : Non trouvé dans le projet.
- Google image search externe : Non trouvé dans le projet.

Média actuel :

- provient des données Reddit/API/RSS ;
- Google Trends ne fournit pas d'image dans `googleTrendsService.js`;
- `MediaBox` n'affiche rien si pas de média réel.

Fonctions média :

- `extractFromReddit`
- `extractMediaForTrend`
- `isPlaceholderMediaUrl`
- `computeMediaFingerprint`

`buildSearchQueries` existe mais retourne `[]`.

## 27. Cache

### Cache backend données

Fichier :

- `backend/services/data/index.js`

Variable module :

- `cache`

Durée :

- `TREND_CACHE_DURATION_MS`
- défaut 10 minutes.

Usage :

- si cache valide, `getRealTrends` retourne `cache.data`.

### Cache Reddit OAuth

Fichier :

- `backend/services/data/redditApi.js`

Variables :

- `cachedAccessToken`
- `cachedTokenExpiration`

Usage :

- réutilise token si expiration supérieure à 60 secondes.

### Cache frontend

LocalStorage :

- `token`
- `theme`
- `trendify_recent_searches`
- `trendi-conversation`
- `feed-seen-trends`

## 28. Tests

### Framework

Backend :

- Node.js test runner natif (`node --test`)

Frontend :

- ESLint configuré.
- Tests frontend : Non trouvé dans le projet.

### Tests backend trouvés

Fichiers :

- `backend/test/analyzeTrend.test.js`
- `backend/test/assistantRelevance.test.js`
- `backend/test/credibilityService.test.js`
- `backend/test/feedSearch.test.js`
- `backend/test/feedSync.test.js`
- `backend/test/feedSyncInterval.test.js`
- `backend/test/googleTrendsGeo.test.js`
- `backend/test/trendService.imageRepair.test.js`

Couverture fonctionnelle observée :

- analyse IA toujours régénérée ;
- analyse IA ne se stocke pas dans Trend ;
- quota remboursé si Groq échoue ;
- assistant conversation/action/recherche ;
- pertinence GTA 6 vs Memorial Day ;
- mapping football/sport ;
- matching AI/IA ;
- crédibilité trusted/unverified ;
- recherche feed ;
- catégories sémantiques ;
- feedSync évite AI/ML dans le test stub ;
- intervalle feedSync 60 minutes ;
- geo interest Google Trends ;
- réparation image depuis thumbnail.

## 29. Dépendances réellement utilisées selon imports observés

### Backend

Utilisées par imports :

- `axios`
- `bcryptjs`
- `cors`
- `dotenv`
- `express`
- `express-mongo-sanitize`
- `express-rate-limit`
- `google-trends-api`
- `helmet`
- `jsonwebtoken`
- `mongoose`
- `rss-parser`

### Frontend

Utilisées par imports :

- `axios`
- `lucide-react`
- `react`
- `react-dom`
- `react-router-dom`
- `react-svg-worldmap`
- `three`

Tailwind :

- configuration présente.
- usage direct de classes Tailwind dans JSX : Non établi par un inventaire exhaustif CSS, mais `tailwind.config.js` et `postcss.config.js` existent.

### ML

Utilisées dans les scripts Python :

- Flask
- pandas
- scikit-learn
- joblib
- xgboost est importé dans `train.py` mais n'est pas listé dans `ml-model/requirements.txt`.

## 30. Fonctionnalités existantes

Fonctionnalités confirmées par code :

- Landing page publique.
- Inscription.
- Connexion.
- Session JWT.
- Profil utilisateur.
- Préférences utilisateur.
- Thème clair/sombre.
- Feed Explorer.
- Filtres catégorie Explorer.
- Tri récents/top score.
- Pagination via bouton et IntersectionObserver.
- Recherche backend dédiée.
- Recherches récentes localStorage.
- Favoris.
- Page détail de tendance.
- Média source-only.
- Carte geo Google Trends.
- Rapport IA à la demande via Groq.
- Quota IA.
- Assistant Trendi texte.
- Assistant Trendi vocal manuel.
- Actions Trendi :
  - navigation ;
  - thème ;
  - filtre ;
  - recherche ;
  - ouverture tendance ;
  - lancement analyse.
- Collecte Reddit.
- Collecte Google Trends via SerpAPI.
- Interest by region via google-trends-api.
- Scoring.
- Crédibilité.
- Classifieur potentiel basé sur score.
- Module ML Python expérimental séparé.
- Docker backend/frontend/mongo.
- Dockerfile ML séparé.

Fonctionnalités non trouvées :

- OpenRouter runtime actuel.
- ElevenLabs runtime actuel.
- Wake word `Ok Trendi`.
- Service ML Flask intégré au backend Node.
- Frontend tests.
- Render config.
- Vercel config.
- Service ML dans docker-compose.
- Stockage permanent des analyses IA dans MongoDB.
- Fallback local de rapport IA.
- Pipeline média externe Openverse/Wikimedia.

## 31. Cycle de vie complet d'une requête exemple

### GET `/api/feed`

1. Frontend `Feed.jsx` appelle `api.get('/feed', { params })`.
2. Axios ajoute `Authorization: Bearer <token>`.
3. Express reçoit `/api/feed`.
4. `app.js` applique sécurité, CORS, rate limit, logger.
5. `feedRoutes.js` applique `protect`.
6. `authMiddleware` vérifie JWT et charge user.
7. `getFeed` lit query params.
8. Construit personalization profile.
9. Si catégorie/préférence :
   - construit query sémantique ;
   - lit Mongo ;
   - filtre/trie/pagine ;
   - rafraîchit éventuellement `ml_prediction` Reddit si indisponible.
10. Sinon lit via `getFeedTrends`.
11. Si besoin refresh/aucune donnée :
   - collecte sources ;
   - score ;
   - prédit ;
   - sauvegarde.
12. Répond JSON.
13. Frontend déduplique, stocke `baseData`, met `meta`.
14. Feed affiche `FeedCard`.

### POST `/api/feed/:id/analyze`

1. Frontend `AIWorkspace.jsx` charge d'abord `GET /feed/:id`.
2. Puis appelle `POST /feed/:id/analyze`.
3. JWT vérifié par `protect`.
4. `analyzeTrend` valide ObjectId.
5. Charge trend.
6. Vérifie quota.
7. Réserve quota.
8. Appelle Groq.
9. Normalise et valide JSON.
10. Répond au frontend sans stockage Mongo.
11. Frontend attend le loader minimum puis affiche le rapport.

### POST `/api/assistant/chat`

1. Frontend `AssistantWidget` envoie message et contexte court.
2. JWT vérifié.
3. Controller valide message non vide.
4. `askAssistant` classifie l'intention.
5. Si action :
   - retourne action structurée sans Groq.
6. Si conversation/help :
   - retourne réponse locale courte.
7. Sinon :
   - récupère tendances pertinentes ;
   - construit contexte ;
   - appelle Groq ;
   - retourne réponse et jusqu'à trois cartes tendance.
8. Frontend ajoute le message.
9. Si action structurée :
   - exécute navigation/thème/filtre/recherche/analyse.

## 32. Optimisations présentes

Optimisations backend :

- cache mémoire `getRealTrends`.
- token Reddit OAuth en cache.
- upsert Mongo par slug.
- chunk saveTrends par 100.
- limites de pagination :
  - feed max 100 ;
  - search max 50.
- scan limits :
  - recherche 500 ;
  - catégories 700.
- `Promise.allSettled` pour sources.
- `Promise.all` pour certaines opérations d'enrichissement.
- `autoIndex: false` en connexion Mongo.
- indexes Mongo déclarés dans schema Trend.
- logs debug désactivables.

Optimisations frontend :

- lazy image loading dans `MediaBox`.
- pas de placeholder image générique.
- localStorage pour recherches récentes, feed seen, thème et conversation.
- déduplication feed côté frontend.
- IntersectionObserver pour charger plus.
- Three.js `powerPreference: low-power`.
- pixelRatio plafonné à 1.5.
- `prefers-reduced-motion` respecté dans background.

## 33. Fichiers importants et rôles

### Backend

- `backend/app.js` : app Express, sécurité, routes.
- `backend/server.js` : listen + feedSync.
- `backend/config/config.js` : variables d'environnement.
- `backend/config/db.js` : connexion Mongo.
- `backend/models/User.js` : schema utilisateur.
- `backend/models/Trend.js` : schema tendance.
- `backend/routes/userRoutes.js` : auth/profile/preferences/saved.
- `backend/routes/feedRoutes.js` : feed/search/detail/analyze/save.
- `backend/routes/assistantRoutes.js` : Trendi chat.
- `backend/controllers/userController.js` : logique utilisateur.
- `backend/controllers/feedController.js` : logique feed/recherche/detail/analyse.
- `backend/controllers/assistantController.js` : controller chat Trendi.
- `backend/services/data/index.js` : orchestration sources.
- `backend/services/data/redditService.js` : transformation Reddit en trends.
- `backend/services/data/redditApi.js` : Reddit OAuth + fallback RSS.
- `backend/services/data/redditRss.js` : RSS parser Reddit.
- `backend/services/data/googleTrendsService.js` : SerpAPI + geo interest.
- `backend/services/data/cleaner.js` : nettoyage/validation/sentiment simple.
- `backend/services/data/mediaExtractor.js` : extraction média source-only.
- `backend/services/data/mediaUniqueness.js` : fingerprint média.
- `backend/services/trendService.js` : scoring, persistence, feed queries.
- `backend/services/feedSync.js` : synchronisation background.
- `backend/services/aiService.js` : rapport IA Groq.
- `backend/services/assistantService.js` : intelligence Trendi.
- `backend/services/credibilityService.js` : crédibilité/fake news heuristique.
- `backend/services/mlService.js` : wrapper prédiction potentiel.
- `backend/services/potentialClassifier.js` : classifieur score.
- `backend/services/featureGenerator.js` : features type ML.
- `backend/utils/logger.js` : logs conditionnels.

### Frontend

- `frontend/src/App.jsx` : routes et providers.
- `frontend/src/main.jsx` : bootstrap React.
- `frontend/src/api/axios.js` : client API + token.
- `frontend/src/context/AuthContext.jsx` : session utilisateur.
- `frontend/src/context/ThemeContext.jsx` : thème.
- `frontend/src/components/Navbar.jsx` : navigation.
- `frontend/src/components/AssistantWidget.jsx` : Trendi UI/voix/actions.
- `frontend/src/components/Ambient3DBackground.jsx` : background 3D.
- `frontend/src/components/MediaBox.jsx` : média.
- `frontend/src/pages/LandingPage.jsx` : landing publique.
- `frontend/src/pages/Login.jsx` : connexion.
- `frontend/src/pages/Signup.jsx` : inscription.
- `frontend/src/pages/Home.jsx` : accueil interne.
- `frontend/src/pages/Feed.jsx` : explorer/feed.
- `frontend/src/pages/SearchPage.jsx` : recherche.
- `frontend/src/pages/Favorites.jsx` : favoris.
- `frontend/src/pages/Profile.jsx` : profil/préférences/thème.
- `frontend/src/pages/TrendDetail.jsx` : détail tendance.
- `frontend/src/pages/AIWorkspace.jsx` : rapport IA.
- `frontend/src/utils/feedMix.js` : mix feed frontend.
- `frontend/src/utils/media.js` : médias frontend.
- `frontend/src/utils/ui.js` : score et nettoyage résumé.
- `frontend/src/index.css` : styles principaux.

### ML

- `ml-model/app.py` : serveur Flask de prédiction.
- `ml-model/train.py` : entraînement.
- `ml-model/predict.py` : test local de prédiction.
- `ml-model/models/trend_predictor.pkl` : modèle sauvegardé.
- `ml-model/data/Redit_data.csv` : dataset d'entraînement principal.
- `ml-model/data/trends_dataset.csv` : petit dataset séparé.

## 34. Volumétrie source observée

Exemples de fichiers volumineux :

- `frontend/src/index.css` : 5795 lignes.
- `frontend/src/components/AssistantWidget.jsx` : 803 lignes.
- `backend/controllers/feedController.js` : 783 lignes.
- `backend/services/assistantService.js` : 708 lignes.
- `backend/services/trendService.js` : 547 lignes.
- `frontend/src/pages/Feed.jsx` : 505 lignes.
- `frontend/src/pages/AIWorkspace.jsx` : 365 lignes.
- `frontend/src/pages/TrendDetail.jsx` : 353 lignes.

## 35. Informations explicitement non trouvées

Les éléments suivants n'ont pas été trouvés dans le projet analysé :

- OpenRouter comme provider IA actif.
- ElevenLabs.
- Wake word `Ok Trendi`.
- Intégration backend Node vers le Flask ML.
- Service ML dans `docker-compose.yml`.
- Fichier `render.yaml`.
- Fichier `vercel.json`.
- `.env.example`.
- `backend/.env.example`.
- Tests frontend.
- Stockage permanent des rapports IA dans MongoDB.
- Pipeline média externe Openverse.
- Pipeline média externe Wikimedia.
- Route `/api/trends`.
- Route `/api/feed/repair-media`.
- Déploiement Kubernetes.
- Monitoring applicatif externe.
- Sentry.
- CI GitHub Actions.
- Documentation Swagger/OpenAPI.

## 36. Conclusion factuelle

Trendify est une application full-stack React + Express + MongoDB. Le backend collecte des tendances depuis Reddit et Google Trends, les nettoie, les score, évalue leur crédibilité, les persiste dans MongoDB, expose un feed filtré/personnalisé, une recherche, des favoris, une page détail, des rapports IA via Groq, et un assistant Trendi. Le frontend fournit les pages publiques et privées, une navigation responsive, un thème clair/sombre, un fond 3D, une interface de feed, recherche, favoris, profil, détail, rapport IA et Trendi avec mode vocal manuel.

Le dossier `ml-model` existe avec Flask, dataset, entraînement et modèle sauvegardé, mais aucune intégration runtime Node -> Flask n'a été trouvée. Le backend runtime utilise actuellement un classifieur interne basé sur le score pour `ml_prediction`.

Les fournisseurs externes réellement utilisés dans le code runtime sont Reddit, SerpAPI, google-trends-api et Groq. OpenRouter, ElevenLabs et le wake word ne sont pas présents dans le runtime actuel.
