# Rapport d'audit professionnel - Trendify

## 1. Executive Summary

Trendify est aujourd'hui un projet PFA crédible et démontrable. Le produit possède une vraie interface, un backend Express structuré, une base MongoDB, une collecte Reddit / Google Trends, un feed personnalisé, des favoris, une recherche dédiée, une analyse IA via Groq et un assistant Trendi.

Le projet est solide pour une soutenance, mais il ne doit pas être présenté comme un SaaS production-ready. Les principaux points faibles sont :

- les promesses de fake news detection et de credibility verification ne sont pas réellement implémentées dans le runtime ;
- le modèle ML Flask existe mais n'est pas utilisé par le backend actuel ;
- la prédiction runtime est un classifieur interne basé sur le score ;
- les index MongoDB nécessaires ne sont pas explicitement définis ;
- le dépôt contient beaucoup d'artifacts et reste trop lourd ;
- le lint frontend échoue encore ;
- Docker contient une configuration IA obsolète liée à OpenRouter.

Validation runtime effectuée :

```text
backend npm test: PASS, 14/14
frontend npm run build: PASS
frontend npm run lint: FAIL, 2 errors, 1 warning
repo excluding node_modules: ~1.26 GB
artifacts/: ~1.23 GB, ~11,982 files
```

Score final honnête :

```text
PFA readiness: 72/100
SaaS readiness: 45/100
```

Verdict : bon projet PFA, démontrable, mais à présenter honnêtement comme une plateforme de détection et d'analyse de tendances, pas comme un système complet de vérification d'information ou de ML production.

---

## 2. Architecture Review

Architecture actuelle :

```text
React frontend
↓
Express API
↓
MongoDB
↓
Feed pipeline: Reddit + SerpAPI Google Trends
↓
Scoring + internal potential classifier
↓
Groq analysis on demand
```

Points forts :

- séparation frontend/backend claire ;
- routes protégées par JWT ;
- feed, recherche, favoris, préférences, analyse IA et Trendi connectés ;
- synchronisation de feed en arrière-plan dans `backend/services/feedSync.js` ;
- architecture suffisamment lisible pour un PFA.

Points faibles :

- `backend/controllers/feedController.js` concentre trop de responsabilités : feed, pagination, recherche, personnalisation, quota IA, appel IA, formatage de réponse ;
- `backend/services/trendService.js` mélange scoring, persistance, ML, média, ranking et related trends ;
- le service ML Flask existe mais n'est pas intégré au runtime Node ;
- le dépôt contient beaucoup d'artifacts, ce qui donne une impression de manque de nettoyage final.

Recommandations :

- séparer `feedController`, `searchController`, `analysisController` ;
- séparer `trendScoringService`, `trendRepository`, `trendPersistenceService` ;
- supprimer ou déplacer les artifacts lourds hors du dépôt final ;
- documenter clairement le flux runtime réel.

---

## 3. Backend Review

Fichiers principaux :

- `backend/app.js` : configuration Express, middleware sécurité, routes.
- `backend/server.js` : démarrage serveur + feedSync.
- `backend/config/config.js` : variables d'environnement.
- `backend/config/db.js` : connexion MongoDB.
- `backend/controllers/feedController.js` : feed, recherche, détail, analyse.
- `backend/controllers/userController.js` : inscription, login, préférences, favoris.
- `backend/controllers/assistantController.js` : endpoint Trendi.
- `backend/routes/*.js` : définition des routes.
- `backend/middleware/*.js` : auth, erreurs, logs, async handler.
- `backend/models/*.js` : schémas MongoDB.

Points forts :

- `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize` sont utilisés ;
- JWT protège les routes principales ;
- quota IA réservé de manière atomique avant l'appel Groq ;
- erreurs IA propres avec `status: "ai_unavailable"` ;
- tests backend existants et passants.

Risques :

- `/api/users/profile` retourne directement `req.user` dans `backend/routes/userRoutes.js` ;
- `savedCount` peut devenir incohérent en cas d'appels concurrents ;
- pas d'index Mongo explicites malgré `autoIndex: false` ;
- `docker-compose.yml` contient encore `OPENROUTER_API_KEY` ;
- `TREND_ANALYSIS_LIMIT` reste dans `config.js` alors que l'analyse batch a été retirée ;
- `REDDIT_USER_AGENT` contient encore `TrendAI/1.0`.

Correction recommandée pour le profil :

```js
router.get("/profile", protect, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    preferences: req.user.preferences,
    savedTrends: req.user.savedTrends,
    aiRemaining: req.user.aiRemaining
  });
});
```

Correction recommandée pour MongoDB :

```js
trendSchema.index({ slug: 1 }, { unique: true });
trendSchema.index({ score: -1, updatedAt: -1 });
trendSchema.index({ fetchedAt: -1, createdAt: -1 });
trendSchema.index({ category: 1, score: -1 });
trendSchema.index({ source: 1 });
trendSchema.index({ title: "text", tags: "text", category: "text" });
```

---

## 4. Frontend Review

Fichiers principaux :

- `frontend/src/App.jsx` : routes frontend.
- `frontend/src/api/axios.js` : client API + token JWT.
- `frontend/src/context/AuthContext.jsx` : session utilisateur.
- `frontend/src/context/ThemeContext.jsx` : thème clair/sombre.
- `frontend/src/components/Navbar.jsx` : navigation.
- `frontend/src/components/AssistantWidget.jsx` : Trendi, texte, voix, speech recognition.
- `frontend/src/components/Ambient3DBackground.jsx` : background 3D.
- `frontend/src/pages/Feed.jsx` : feed principal.
- `frontend/src/pages/SearchPage.jsx` : recherche dédiée.
- `frontend/src/pages/AIWorkspace.jsx` : rapport IA.
- `frontend/src/pages/Home.jsx` : accueil interne.
- `frontend/src/pages/Profile.jsx` : profil, préférences, thème.
- `frontend/src/pages/Favorites.jsx` : favoris.
- `frontend/src/pages/TrendDetail.jsx` : détail tendance.

Points forts :

- interface moderne ;
- navigation claire ;
- recherche séparée du feed ;
- Trendi bien intégré ;
- bonne expérience de chargement pour le rapport IA ;
- responsive globalement correct ;
- build frontend OK.

Points faibles :

- `npm run lint` échoue ;
- `SearchPage.jsx` appelle `setState` directement dans un `useEffect` ;
- `frontend/src/utils/media.js` contient `simpleHash` inutilisé ;
- `Feed.jsx` contient deux effets qui peuvent déclencher un chargement initial du feed ;
- beaucoup de styles inline ;
- certains textes restent génériques dans le détail de tendance ;
- pas de tests frontend.

Résultat lint :

```text
frontend/src/pages/SearchPage.jsx
  error: setState synchronously within an effect

frontend/src/utils/media.js
  error: simpleHash is assigned but never used

frontend/src/pages/AIWorkspace.jsx
  warning: unnecessary dependency 'trend'
```

Priorités frontend :

1. corriger le lint ;
2. supprimer le double fetch initial dans `Feed.jsx` ;
3. nettoyer les textes génériques ;
4. réduire les styles inline dans les composants principaux.

---

## 5. Data Pipeline Review

Fichiers revus :

- `backend/services/data/cleaner.js`
- `backend/services/data/redditService.js`
- `backend/services/data/redditApi.js`
- `backend/services/data/redditRss.js`
- `backend/services/data/googleTrendsService.js`
- `backend/services/data/index.js`

Fonctionnement actuel :

```text
Reddit OAuth ou RSS
Google Trends via SerpAPI
↓
cleanTitle / validation simple
↓
dedupe par titre normalisé
↓
interleaving des sources
↓
scoreTrends()
↓
saveTrends()
↓
MongoDB
```

Points forts :

- Reddit OAuth prioritaire avec fallback RSS ;
- Google Trends via SerpAPI avec timeout ;
- cache mémoire de 10 minutes ;
- déduplication simple par titre ;
- fusion des sources par interleaving ;
- pipeline suffisamment fonctionnel pour une démo.

Limites :

- `credibilityService.js` n'existe pas dans le runtime ;
- `aiEvaluatorService.js` n'existe pas dans le runtime ;
- pas de vraie détection de fake news ;
- `cleanTitle()` supprime beaucoup de caractères utiles ;
- sentiment basé uniquement sur des mots-clés ;
- croissance et popularité ne sont pas scientifiquement comparables entre Reddit et Google Trends ;
- Reddit reste séquentiel, donc sensible aux lenteurs ;
- Google Trends dépend fortement de `SERPAPI_KEY`.

Conclusion technique :

Le pipeline est valide comme prototype PFA de collecte et scoring. Il n'est pas valide comme système robuste de vérification d'information ou de fake news detection.

---

## 6. AI Review

Fichiers revus :

- `backend/services/aiService.js`
- `backend/services/assistantService.js`
- `backend/controllers/feedController.js`
- `backend/controllers/assistantController.js`

Provider actuel :

```text
Groq
model default: llama-3.3-70b-versatile
endpoint: https://api.groq.com/openai/v1/chat/completions
```

Points forts :

- OpenRouter n'est plus utilisé dans le runtime principal ;
- Groq fonctionne réellement ;
- pas de fallback local IA ;
- analyse générée à la demande uniquement ;
- le rapport IA est structuré ;
- Trendi filtre le contexte selon le sujet détecté ;
- les erreurs Groq sont propres côté utilisateur.

Points faibles :

- la qualité dépend fortement du titre, de la catégorie et des tags ;
- l'IA n'a pas accès au contenu complet des articles ;
- pas de vérification multi-source ;
- parsing JSON fragile : extraction du premier `{` au dernier `}` ;
- si Groq renvoie un JSON invalide, l'utilisateur obtient une erreur indisponible ;
- Trendi ne fait pas de recherche sémantique, seulement regex / mots-clés.

Valeur ajoutée réelle :

- forte pour la démonstration ;
- moyenne pour un vrai SaaS ;
- dépendante de la qualité des données collectées.

Recommandations :

- utiliser un mode JSON strict si supporté par le modèle Groq ;
- enrichir le prompt avec `excerpt`, source et lien ;
- ajouter une règle de prudence : "ne pas inventer de faits non présents" ;
- logger le modèle utilisé et le temps de génération ;
- ne pas stocker les analyses en MongoDB, ce qui est déjà le comportement actuel.

---

## 7. ML Review

Fichiers revus :

- `backend/services/mlService.js`
- `backend/services/potentialClassifier.js`
- `backend/services/featureGenerator.js`
- `ml-model/train.py`
- `ml-model/app.py`
- `ml-model/predict.py`
- `ml-model/data/Redit_data.csv`

Constat brutal :

Le ML Flask existe, mais il n'est pas utilisé par le backend runtime. La prédiction actuelle est un classifieur interne basé sur le score :

```text
score >= 70 => HIGH
score < 70  => LOW
invalid     => UNAVAILABLE
```

Ce comportement se trouve dans `backend/services/potentialClassifier.js`.

Points faibles ML :

- Flask ML non intégré ;
- `app.py` contient deux décorateurs identiques `@app.route("/predict")` ;
- Flask lance sur le port 5000 alors que le Dockerfile expose 5001 ;
- dataset Reddit ancien et spécifique ;
- features très simples ;
- pas de suivi d'expérience ;
- pas de validation production ;
- pas de monitoring modèle ;
- pas de pipeline d'entraînement automatisé.

Conclusion :

Le ML est acceptable comme élément expérimental de PFA, mais il ne faut pas dire que le produit repose réellement sur un modèle ML avancé. Le runtime repose sur un score heuristic + seuil.

Recommandation de soutenance :

Dire :

```text
Nous avons un module ML expérimental entraîné sur des données Reddit.
Dans la version démontrée, la prédiction de potentiel utilisée par le backend est un classifieur score-based plus stable pour la soutenance.
```

Ne pas dire :

```text
Notre modèle ML prédit réellement les tendances virales en production.
```

---

## 8. Security Review

Points forts :

- JWT ;
- bcrypt ;
- Helmet ;
- CORS configuré ;
- rate limiting ;
- body limit 10kb ;
- mongo sanitize ;
- routes principales protégées.

Risques :

- `backend/.env` existe localement ;
- Docker utilise `JWT_SECRET=change-me` ;
- Docker utilise encore `OPENROUTER_API_KEY` ;
- JWT stocké dans `localStorage` ;
- pas de refresh token ;
- pas de email verification ;
- pas de reset password ;
- pas de RBAC ;
- pas d'audit logs ;
- `profile` retourne un document utilisateur trop brut.

Priorité sécurité :

1. ne jamais zipper `.env` ;
2. créer `.env.example` ;
3. corriger `docker-compose.yml` ;
4. remplacer `JWT_SECRET=change-me` ;
5. retourner un DTO propre pour `/profile`.

---

## 9. Performance Review

Points forts :

- limite feed bornée à 100 ;
- cache data 10 minutes ;
- feedSync non bloquant ;
- Groq rapide ;
- pagination backend existante.

Points faibles :

- Reddit fetch séquentiel ;
- timeout Reddit 30s ;
- `getFeedTrends()` fait `countDocuments` + deux agrégations à chaque feed ;
- regex search sans index ;
- pas de Redis ;
- pas de queue ;
- pas de métriques de latence ;
- `saveTrends()` peut devenir lourd avec beaucoup d'upserts.

Priorités performance :

1. ajouter indexes Mongo ;
2. cacher `sourceCounts` et `categoryCounts` ;
3. réduire timeouts Reddit ;
4. isoler feedSync dans un worker ;
5. ajouter métriques de durée par endpoint.

---

## 10. DevOps Review

Points forts :

- Dockerfiles présents ;
- docker-compose présent ;
- backend tests OK ;
- frontend build OK.

Points faibles :

- docker-compose non aligné avec Groq ;
- ML non inclus dans docker-compose ;
- root scripts cassés ;
- pas de CI/CD ;
- pas de healthcheck ;
- pas de `.env.example` ;
- pas de script de création d'index ;
- repo trop lourd à cause de `artifacts/`.

Correction docker recommandée :

```yaml
backend:
  environment:
    - PORT=5000
    - MONGO_URI=mongodb://mongo:27017/trend_predictor
    - JWT_SECRET=${JWT_SECRET}
    - GROQ_API_KEY=${GROQ_API_KEY}
    - GROQ_MODEL=llama-3.3-70b-versatile
    - SERPAPI_KEY=${SERPAPI_KEY}
    - NODE_ENV=production
```

---

## 11. PFA Jury Review

Ce qui impressionnera le jury :

- UI moderne ;
- navigation claire ;
- feed personnalisé ;
- collecte Reddit / Google Trends ;
- analyse IA rapide via Groq ;
- assistant Trendi ;
- recherche dédiée ;
- favoris ;
- tests backend passants.

Ce qui sera critiqué :

- fake news detection non implémentée ;
- credibility verification non implémentée ;
- ML non intégré réellement ;
- lint frontend en échec ;
- repo énorme ;
- Docker obsolète ;
- pas d'indexes Mongo visibles ;
- scoring heuristique.

Questions probables :

1. Comment vérifiez-vous qu'une tendance est vraie ?
2. Comment calculez-vous le score ?
3. Votre modèle ML est-il réellement utilisé ?
4. Pourquoi Groq ?
5. Que se passe-t-il si Groq tombe ?
6. Comment les préférences personnalisent-elles le feed ?
7. Comment évitez-vous les doublons ?
8. Comment comparez-vous Reddit et Google Trends ?
9. Quels indexes MongoDB utilisez-vous ?
10. Comment déployeriez-vous ce projet ?

Réponses recommandées :

- "La version actuelle détecte et priorise les signaux ; la vérification de crédibilité complète est une extension prévue."
- "Le score est heuristique et combine popularité, momentum, fraîcheur, sentiment, confiance source et diversité."
- "Le modèle Flask est expérimental ; le runtime actuel utilise un classifieur score-based plus stable."
- "Groq a été choisi pour la vitesse et la fiabilité de démonstration."
- "Si Groq échoue, l'interface affiche un message propre sans générer de faux rapport local."

---

## 12. Critical Issues

### Critique

1. Fake news detection non implémentée.
2. Credibility verification non implémentée.
3. ML runtime beaucoup plus simple que ce que le projet peut laisser croire.
4. Docker encore configuré pour OpenRouter.
5. Lint frontend en échec.
6. Repo pollué par `artifacts/`.

### Important

1. Mongo indexes absents.
2. FeedController trop gros.
3. TrendService trop gros.
4. Recherche regex non scalable.
5. `savedCount` non atomique.
6. JWT en localStorage.
7. Reddit séquentiel.

### Mineur

1. Textes UI encore génériques.
2. Root scripts cassés.
3. Styles inline nombreux.
4. Pas de frontend tests.
5. Logs console nombreux.

---

## 13. Recommended Improvements

Avant soutenance :

1. Corriger `npm run lint`.
2. Mettre à jour `docker-compose.yml` pour Groq.
3. Supprimer ou ignorer `artifacts/`.
4. Ajouter `.env.example`.
5. Préparer une explication honnête sur le ML.
6. Ne pas prétendre à une vraie fake news detection.
7. Ajouter indexes Mongo si possible.

Après soutenance :

1. Intégrer réellement le service ML ou le retirer.
2. Ajouter un vrai service de crédibilité.
3. Ajouter Atlas Search ou index texte Mongo.
4. Ajouter CI/CD.
5. Ajouter tests frontend.
6. Ajouter monitoring et logs structurés.
7. Refactoriser les gros contrôleurs/services.

---

## 14. Priority List

### High

- Fix frontend lint.
- Corriger Docker Groq.
- Nettoyer `artifacts/`.
- Clarifier les claims ML/fake news.
- Ajouter `.env.example`.

### Medium

- Ajouter indexes Mongo.
- Corriger double fetch potentiel dans `Feed.jsx`.
- Créer `/api/health`.
- Nettoyer `TrendDetail` des textes génériques.
- Ajouter script de migration/index.

### Low

- Refactor frontend CSS.
- Ajouter tests UI.
- Ajouter semantic search.
- Ajouter vrai service de crédibilité.
- Ajouter worker queue pour feedSync.

---

## 15. Final Score /100

```text
Architecture:        14/20
Backend:             15/20
Frontend UX/UI:      16/20
Data Pipeline:       12/20
AI Integration:      15/20
ML:                   6/20
Security:            12/20
Performance:         13/20
DevOps:               8/20
PFA Presentation:    16/20
```

Score final pondéré : **72/100**

Verdict final :

```text
Bon projet PFA.
Démontrable.
Visuellement convaincant.
Techniquement correct pour une soutenance.
Pas encore production-ready.
Ne pas survendre la partie ML, fake news ou crédibilité.
```

