# Trend Lifecycle Audit

> Traçage complet d'une tendance : de la source (Reddit / Google Trends) jusqu'à l'affichage frontend.

---

## 1. DATA INGESTION — Sources externes

### 1.1 Reddit

**Fichier** : `backend/services/data/redditService.js`
**Mécanisme** : boucle sur 39 subreddits (`redditSubreddits.js:1`), fetch parallèle pour chaque subreddit

**Ordre d'exécution** :
1. `fetchRedditPosts(subreddit, limit)` → `redditApi.js:77`
   - Si credentials OAuth (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`) → API OAuth `GET /r/{subreddit}/hot`
   - Sinon → fallback RSS (`redditRss.js:23`) via `rss-parser`
   - Jusqu'à `REDDIT_MAX_RETRIES` tentatives (3) avant fallback RSS
2. `cleanTitle(title)` → `cleaner.js:43` — supprime `[...]` et caractères spéciaux
3. `isGoodContent(title)` → `cleaner.js:53` — filtre les mots interdits (violence, sexual, etc.)
4. Déduplication par titre normalisé
5. `estimateSentimentScore(title)` → `cleaner.js:61` — basé sur mots positifs/négatifs
6. `extractFromReddit(postData)` → `mediaExtractor.js:65` : vidéo → preview → URL direct → thumbnail
7. `generateMlFeatures(trend)` → `featureGenerator.js:57` : normalise num_comments, post_length, hour, title_length, sentiment
8. `validateTrend(trend)` → `cleaner.js:81`
9. Tri par `popularity*0.65 + growth*0.25 + num_comments*0.1`
10. Limite à `max(150, REDDIT_FETCH_LIMIT*2)` tendances

**Données produites** par tendance Reddit :
```
title, popularity, growth, source="Reddit", link, image, video, thumbnail,
mediaType, fetchedAt, num_comments, post_length, hour, title_length,
sentiment, tags[], excerpt, source_detail
```

**Dépendances** : `redditApi.js` → `redditRss.js` ; `cleaner.js`, `featureGenerator.js`, `mediaExtractor.js`
**Temps coûteux** : 39 appels réseau (un par subreddit), chaque appel peut prendre 5-30s. Les appels sont séquentiels dans la boucle. Jusqu'à 3 retries par subreddit.

---

### 1.2 Google Trends

**Fichier** : `backend/services/data/googleTrendsService.js`
**Mécanisme** : appel unique à SerpAPI

**Ordre d'exécution** :
1. `GET https://serpapi.com/search.json?engine=google_trends_trending_now&geo=US&api_key=SRPAPI_KEY`
   - Timeout 5s
   - **⚠️ `SERPAPI_KEY` n'est pas défini dans `.env` (absente)** — cette source **retournera une erreur** en production actuelle
2. `cleanTitle(trend.query)` → `cleaner.js:43`
3. `estimateSentimentScore(trend.query)` → `cleaner.js:61`
4. `validateTrend(data)` → `cleaner.js:81`
5. Limite à `max(50, GOOGLE_TRENDS_LIMIT || 120)` tendances

**Données produites** par tendance Google :
```
title, popularity, growth, source="Google Trends", link, fetchedAt,
searchVolume, deltaValue, sentiment, tags[], excerpt
```

**Dépendances** : `cleaner.js`
**Temps coûteux** : 1 appel réseau (5s timeout). Si échoue, la source entière est ignorée.

---

### 1.3 Fusion des sources

**Fichier** : `backend/services/data/index.js`
**Fonction** : `getRealTrends()`

**Ordre d'exécution** :
1. Vérification cache mémoire : si `Date.now() - timestamp < TREND_CACHE_DURATION_MS` (10 min) → retourne cache
2. `buildSourceBuckets()` → lance `getGoogleTrends()` et `getRedditTrends()` **en parallèle** via `Promise.allSettled`
3. `interleaveSourceBuckets(buckets, MAX_TRENDS)` → alternance round-robin entre les sources, déduplication par titre normalisé (stop words supprimés : the, a, an, of...)
4. Mise en cache du résultat

**MAX_TRENDS** = `max(1000, TREND_INGEST_LIMIT || 5000)` — peut produire jusqu'à 5000 tendances brutes

**Temps coûteux** : le cache 10min évite des appels répétés. Sans cache : attente des deux sources externes.

---

## 2. FEED SYNC — Orchestrateur

**Fichier** : `backend/services/feedSync.js`
**Déclenché** : au démarrage du serveur (`server.js:10`) + toutes les 60 min (`DEFAULT_INTERVAL_MS`)

**Fonction** : `runSync()`

**Ordre d'exécution** :
1. Vérifie qu'aucune synchronisation n'est déjà en cours (flag `running`)
2. `getRealTrends()` → étape 1 (fusion sources)
3. `scoreTrends(raw)` → étape 3
4. `raw.slice(0, max(300, TREND_PERSIST_LIMIT || 1000))` → limite à ~1000
5. `saveTrends(toPersist)` → étape 4 (MongoDB)

**Temps coûteux** : le cycle complet (fetch + score + save) peut prendre 2-5 min selon le nombre de tendances. Le flag `running` empêche les chevauchements.

---

## 3. SCORING

**Fichier** : `backend/services/trendService.js`
**Fonction** : `scoreTrends(trends)`

**Ordre d'exécution** :
1. `computeMaxValues(trends)` → trouve les max de `popularity`, `growth`, `engagement` parmi toutes les tendances du lot
2. Normalisation : `source = normalizeSource(trend.source)`, `category = normalizeCategory(trend)`
   - Catégorie inférée via `CATEGORY_KEYWORDS` (10 catégories : AI, Startups, Tech, Gaming, Business...)
3. Comptage des catégories et sources pour le calcul de diversité
4. Pour chaque tendance : `buildScoreDetails(trend, maxValues, categoryShare, sourceShare)`

**Formule de score** :
```
score = clamp(
  18
  + popularityFactor * 22       # log-normalisé
  + momentumFactor * 28         # 0.45*growth + 0.35*engagement + 0.20*sentiment
  + recency * 10                # fraîcheur (24h max)
  + sourceConfidence * 10       # Reddit=0.9, Google=0.85
  + sentimentFactor * 8         # normalisé [0,1]
  + uniquenessFactor * 7        # diversité catégorie/source
, 35, 95)
```

**Score final** : entier entre 35 et 95.

**Dépendances** : aucune externe, purement computationnel
**Temps coûteux** : O(n) linéaire. Négligeable (< 100ms pour 1000 tendances).

---

## 4. ML PREDICTION

### 4.1 Classifieur interne (utilisé en réel)

**Fichiers** : `backend/services/mlService.js` → `backend/services/potentialClassifier.js`

**Fonction** : `predictTrend(trend)` (async, mais ne fait pas d'appels réseau)

**Logique** :
```
if score >= 70 → HIGH (confidence 0.85)
if score < 70  → LOW (confidence 0.70)
if score invalide → UNAVAILABLE (confidence 0.0)
```

**⚠️ Le backend n'utilise PAS le serveur Flask** (`ml-model/app.py`). La prédiction ML est une simple comparaison de seuil sur le score déjà calculé.

### 4.2 Flask (existant mais non connecté)

**Fichier** : `ml-model/app.py`
**Port** : 5001
**Modèle** : `models/trend_predictor.pkl` (RandomForest avec StandardScaler, GridSearch CV=3)
**Features** : num_comments, post_length, hour, title_length, sentiment
**Endpoint** : `POST /predict`

**Non intégré au backend** — classifieur interne préféré.

---

## 5. PERSISTANCE MONGODB

**Fichier** : `backend/services/trendService.js`
**Fonction** : `saveTrends(trends)`

**Ordre d'exécution** :
1. `repairDuplicateMedia(trends)` — vérifie les fingerprints média, remplace les images dupliquées
2. `chunkArray(trends, 100)` — lots de 100 pour éviter les timeouts
3. Pour chaque tendance dans le lot :
   a. `normalizeTrendMedia(trend)` — nettoie l'image/thumbnail/mediaType
   b. `normalizeSource()` + `normalizeCategory()`
   c. `buildSlug(trend)` — slug basé sur source + titre
   d. `shouldReenrichMedia(trend)` — si l'image est absente ou placeholder → `extractMediaForTrend()` (appel externe !)
   e. `generateMlFeatures(trend)` (si Reddit)
   f. `predictTrend(trend)` — classifieur interne score-based (pas d'appel réseau)
   g. `Trend.findOneAndUpdate({ slug }, { $set: update, $setOnInsert: { savedCount: 0 } }, { upsert: true })`
4. Les opérations du lot sont parallélisées via `Promise.all`

**Document MongoDB stocké** (champs principaux) :
```
_id, title, source, category, score, scoreDetails (Mixed),
analysis, idea, excerpt, ml_prediction, popularity, growth,
num_comments, post_length, hour, title_length, sentiment,
image, video, thumbnail, mediaType, mediaFingerprint,
mediaVerifiedAt, mediaSource, link, fetchedAt, tags[], slug,
savedCount, createdAt, updatedAt
```

**Temps coûteux** : les appels `extractMediaForTrend()` sont le goulot d'étranglement — chaque tendance sans image déclenche une recherche Openverse (API externe, 400ms + throttling 400ms entre requêtes). Pour 1000 tendances, cela peut prendre plusieurs minutes.

---

## 6. MEDIA EXTRACTION

**Fichier** : `backend/services/data/mediaExtractor.js`
**Fonction** : `extractMediaForTrend(trend, rawPostData)`

**Ordre des tentatives** (par ordre de priorité) :
1. Si source = Reddit + rawPostData → `extractFromReddit(rawPostData)` : vidéo → preview → URL directe → thumbnail
2. Image directe du trend si URL valide et non-placeholder
3. `fetchOpenGraphImage(trend.link)` → parse `<meta og:image>` / `twitter:image` / `link[rel=image_src]`
4. Recherche Openverse : jusqu'à 8 requêtes construites via `buildSearchQueries()` (combinaisons titre + catégorie + entité + source). Throttling 400ms entre chaque requête. Cache 24h pour les succès, 5min pour les échecs.
5. Si tout échoue → `{ image: '', video: '', thumbnail: '', mediaType: 'none' }`

**⚠️ Les images SVG de fallback sont désactivées** (commentaire ligne 252, 361).
**⚠️ Le `SERPAPI_KEY` manquant dans `.env` rend `fetchOpenGraphImage` moins efficace pour Google Trends** (pas d'URL source riche).

**Dépendances** : Openverse API (externe, HTTP GET)
**Temps coûteux** : ~400ms par requête Openverse + 400ms throttle = ~800ms par tendance sans image. Cache mémoire réduit le coût pour les doublons de requêtes.

---

## 7. FEED GENERATION (API)

**Fichier** : `backend/controllers/feedController.js`
**Route** : `GET /api/feed`
**Fonction** : `getFeed()`

**Deux chemins possibles** :

### Chemin A — Tendances déjà en base (`storedTrends.length > 0 && !forceRefresh`)
1. `getFeedTrends()` depuis MongoDB → `trendService.js:543`
   - Filtre par `category`, `source`, `viral` (ml_prediction = 1/'1'/'viral')
   - Tri : score ↓ (défaut), trending, newest
   - Pagination : `skip/limit`, défaut 12 par page
   - 4 requêtes MongoDB parallèles : `countDocuments`, `find().sort().skip().limit()`, deux `aggregate` (sourceCounts, categoryCounts)
   - Les résultats passent par `normalizeStoredTrends()` → `scoreTrends()` + `generateMlFeatures()`
   - `mixFeedItems()` — réordonnancement avec boosts : fraîcheur, non-vu, aléatoire, diversité catégorie
2. Filtrage par préférences utilisateur (`user.preferences`)
3. `refreshRedditPrediction(trend)` pour chaque tendance — si prédiction nulle/UNKNOWN/UNAVAILABLE et source Reddit → recalcule via classifieur interne et persist en base
4. Formatage de la réponse

### Chemin B — Force refresh ou base vide
1. `getRealTrends()` → fetch sources externes
2. `scoreTrends(rawTrends).slice(0, 24)` → scoring
3. `generateBatchAnalysis(analysisBatch)` → appel OpenRouter batch (25 tendances max)
4. `predictTrend(trend)` pour chaque → classifieur interne
5. `saveTrends(enrichedTrends)` → persist en MongoDB
6. Filtrage par préférences utilisateur
7. Formatage de la réponse

**Réponse formatée** (par tendance) :
```
{ id, _id, title, score, source, category, popularity, growth,
  image, video, thumbnail, mediaType, analysis, idea, link,
  ml_prediction, createdAt, savedCount, isSaved }
```

**Données supplémentaires** : `meta` (total, page, totalPages, sourceCounts, categoryCounts), `user.aiRemaining`

**Temps coûteux** :
- Chemin A : rapide si cache MongoDB hit (~100-500ms)
- Chemin B : **très lent** — fetch sources (30s-2min) + batch AI (5-15s) + save + media (minutes). C'est pourquoi le feed sync tourne en arrière-plan toutes les 60 min.

---

## 8. ANALYSE IA (détail tendance)

**Fichier** : `backend/controllers/feedController.js`
**Route** : `POST /api/feed/:id/analyze`
**Fonction** : `analyzeTrend()`

**Ordre d'exécution** :
1. Validation ID MongoDB (`Types.ObjectId.isValid`)
2. `getTrendById(id)` → recherche MongoDB
3. Vérification si analyse stockée réutilisable (`hasRealStoredAnalysis`) — détecte les textes fallback via patterns regex
4. ⚡ **Si analyse stockée valide** → retourne sans consommer de quota
5. Sinon :
   a. Vérification `aiRemaining > 0`
   b. **Réservation atomique du quota** : `User.findOneAndUpdate({ _id, aiRemaining: { $gt: 0 } }, { $inc: { aiRemaining: -1 } })`
   c. `generateTrendAnalysis(trend)` → appel OpenRouter (modèle `openai/gpt-3.5-turbo`)
   d. Si OpenRouter échoue → restauration du quota + fallback
   e. `predictTrend(trend)` → classifieur interne
   f. Persistance de l'analyse et de la prédiction dans MongoDB

**Réponse** :
```
{ trend: { id, title, source, category, score, scoreDetails, analysis, idea, link... },
  analysis: { status: 'openrouter'|'stored'|'fallback', summary, opportunity, ... },
  aiRemaining: N }
```

**Temps coûteux** : appel OpenRouter (2-8s). Sinon quasi-instantané si analyse déjà stockée.

---

## 9. FRONTEND — Feed

**Fichier** : `frontend/src/pages/Feed.jsx`

**Cycle de vie d'une page Feed** :
1. **Mount** → `useEffect` lance `fetchFeed(1, true)` + `fetchSavedTrends()`
2. `fetchFeed(page, reset)` → `GET /api/feed?page=N&limit=24&seen=...&source=...`
3. Les résultats bruts passent par `dedupeTrends()` (Map par _id/id/slug/title)
4. `applyFeedMix(filteredTrends, seenIds, options)` → mélange côté frontend basé sur un seed aléatoire
5. Affichage infini via `IntersectionObserver` + fallback timer 3.5s
6. Actions utilisateur : sauvegarde (POST/DELETE `/api/feed/:id/save`), navigation vers détail (`/feed/:id`)

**Pagination** : 24 items par page, scroll infini
**Filtres** : source (Newest/Google/Reddit), recherche textuelle

**Temps réseau** : ~1 requête API par page. Les tendances sont pré-chargées depuis MongoDB.

---

## 10. FRONTEND — Détail tendance

**Fichier** : `frontend/src/pages/TrendDetail.jsx`
**Route** : `/feed/:id`

**Cycle** :
1. `GET /api/feed/:id` → récupère la tendance + 6 tendances liées
2. Affichage : titre, source, score, momentum (HIGH/LOW), badges, analyse, idée de contenu
3. Sidebar : fiche rapide, tendances liées, bouton "Faire analyser avec l'IA" → `/ai/:id`

**Temps réseau** : 1 requête API (rapide, lecture MongoDB seule).

---

## 11. FRONTEND — Analyse IA

**Fichier** : `frontend/src/pages/AIWorkspace.jsx`
**Route** : `/ai/:id`

**Cycle** :
1. `GET /api/feed/:id` → détail tendance
2. `POST /api/feed/:id/analyze` → analyse IA (consomme quota)
3. Affichage progressif avec indices de progression

**Temps réseau** : 2 requêtes. La seconde peut prendre 2-8s (OpenRouter).

---

## DIAGRAMME DE FLUX — Résumé

```
Google Trends          Reddit (39 subreddits)
    │                      │
    │ (SerpAPI)            │ (OAuth API → RSS fallback)
    │ timeout 5s           │ ~30s-2min total
    ▼                      ▼
┌─────────────────────────────────────┐
│      getRealTrends()                │
│      services/data/index.js         │
│  ─ cache 10min                      │
│  ─ Promise.allSettled() parallèle   │
│  ─ interleave + dedup               │
│  ─ MAX_TRENDS ~1000-5000            │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│      scoreTrends()                  │
│      services/trendService.js       │
│  ─ computeMaxValues()               │
│  ─ buildScoreDetails()              │
│  ─ formule complexe (35-95)         │
│  ⚡ O(n) rapide                     │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│      predictTrend()                 │
│      services/mlService.js          │
│  ─ potentialClassifier.js           │
│  ─ score >= 70 → HIGH              │
│  ⚡ Pas d'appel réseau              │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│      saveTrends()                   │
│      services/trendService.js       │
│  ─ repairDuplicateMedia()           │
│  ─ chunks de 100                    │
│  ─ extractMediaForTrend() 💥 lent  │
│  ─ findOneAndUpdate({slug}, upsert)│
│  ⚡ Appels Openverse si pas d'image │
└──────────────┬──────────────────────┘
               ▼
        ┌─────────────┐
        │   MongoDB   │
        │  Trend.col  │
        └──────┬──────┘
               │ (lecture)
               ▼
┌─────────────────────────────────────┐
│      getFeedTrends()                │
│      services/trendService.js       │
│  ─ 4 requêtes MongoDB parallèles    │
│  ─ normalizeStoredTrends()          │
│  ─ mixFeedItems()                   │
│  ⚡ Rapide (100-500ms)              │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│      getFeed()                      │
│      controllers/feedController.js  │
│  ─ refreshRedditPrediction()        │
│  ─ filtrage préférences utilisateur │
│  ─ formatage réponse API            │
└──────────────┬──────────────────────┘
               │ (JSON)
               ▼
┌─────────────────────────────────────┐
│      Feed.jsx                       │
│  ─ GET /api/feed                    │
│  ─ dedupeTrends()                   │
│  ─ applyFeedMix() côté frontend     │
│  ─ scroll infini (IntersectionObs.) │
└──────────────┬──────────────────────┘
               │ (clic)
               ▼
┌─────────────────────────────────────┐
│      TrendDetail.jsx                │
│  ─ GET /api/feed/:id                │
│  ─ affichage détails + tendances    │
│  ─ bouton → /ai/:id pour analyse    │
└──────────────┬──────────────────────┘
               │ (clic)
               ▼
┌─────────────────────────────────────┐
│      AIWorkspace.jsx                │
│  ─ POST /api/feed/:id/analyze      │
│  ─ OpenRouter call 💥 2-8s         │
│  ─ quota atomique                   │
│  ─ affichage analyse complète       │
└─────────────────────────────────────┘
```

---

## TEMPS COÛTEUX — Classification

| Étape | Temps estimé | Goulot |
|-------|-------------|--------|
| Fetch Reddit (39 subreddits) | 30s – 2min | Appels réseau OAuth/RSS |
| Fetch Google Trends | 0.5s – 5s | SerpAPI (⚠️ clé manquante = échec) |
| Scoring (1000 tendances) | < 100ms | CPU, négligeable |
| ML Prediction (1000 tendances) | < 50ms | CPU, classifieur local |
| Media Extraction (par tendance) | 400ms – 2s | Openverse API + throttle 400ms |
| Batch AI Analysis (OpenRouter) | 5s – 15s | API externe GPT-3.5 |
| Sauvegarde MongoDB (1000 tendances) | 5s – 30s | Écritures + media extraction |
| Feed sync complet | 2min – 5min | Media extraction + OpenRouter |
| Lecture feed (page 1) | 100ms – 500ms | 4 requêtes MongoDB |
| Analyse IA détail (POST /analyze) | 2s – 8s | OpenRouter API |

---

## DÉPENDANCES EXTERNES

| Service | Utilisation | Endpoint | Clé requise | Statut |
|---------|-------------|----------|-------------|--------|
| Reddit OAuth API | Fetch posts | `oauth.reddit.com` | `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | ✅ dans `.env` (présent) |
| Reddit RSS (fallback) | Fetch posts | `reddit.com/r/.../.rss` | Aucune | ✅ Toujours dispo |
| SerpAPI (Google Trends) | Fetch tendances | `serpapi.com/search.json` | `SERPAPI_KEY` | ❌ **ABSENT du `.env`** |
| OpenRouter (GPT-3.5) | Analyse IA | `openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | ✅ dans `.env` |
| Openverse | Recherche d'images | `openverse.org/api/v1/images/` | Aucune | ✅ Toujours dispo |
| Groq (optionnel) | Analyse IA alternative | `api.groq.com` | `GROQ_API_KEY` | ✅ dans `.env` |

---

## FLUX ALTERNATIFS ET CAS LIMITES

1. **Cache hit** (getRealTrends) : pas d'appel externe, retour immédiat
2. **Feed sync déjà en cours** : skip, pas de chevauchement
3. **Aucune source disponible** : erreur 503 "No trend data available"
4. **Force refresh** (`?refresh=true`) : consomme 1 quota IA, fetch + score + analyse batch
5. **Analyse déjà stockée** : retour immédiat via `hasRealStoredAnalysis()`, pas d'appel OpenRouter
6. **Quota IA épuisé** : erreur 429 "Votre quota d'analyses IA est épuisé"
7. **Échec OpenRouter** : fallback avec textes génériques, quota remboursé
8. **Reddit sans OAuth** : fallback RSS transparent
9. **Image manquante** : recherche Openverse, cache 24h, 5min pour les échecs
10. **Média dupliqué** : `repairDuplicateMedia()` remplace les images identiques sur des tendances non-liées
