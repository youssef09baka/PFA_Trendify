# ML Runtime Audit

> Vérification de la connexion réelle entre le modèle entraîné (`ml-model/`) et le runtime backend/frontend.
> Aucune hypothèse — uniquement des preuves issues du code source.

---

## Question 1 : Le modèle entraîné dans `ml-model/` est-il réellement utilisé ?

**🔴 NON. Aucune utilisation en runtime.**

### Preuves

**Fichier** : `ml-model/app.py`
```python
model = joblib.load("models/trend_predictor.pkl")   # ligne 9
app.run(port=5000)                                     # ligne 61
```
Serveur Flask qui écoute sur le port **5000** (et 5001 selon le Dockerfile).

**Fichier** : `docker-compose.yml`
```yaml
services:
  mongo:    # port 27017
  backend:  # port 5000
  frontend: # port 4173
```
Le service `ml-model` n'apparaît **pas** dans le docker-compose. Aucun réseau ne le connecte au backend.

**Fichier** : `backend/services/mlService.js` (lignes 57-61)
```js
/**
 * Predict trend potential using score-based classifier
 * 
 * This replaces the external ML service with an internal classifier
 * that uses verified thresholds based on real production data:
 * - HIGH:        score >= 70 (top tier)
 * - LOW:         score < 70 (bottom tier)
 * - UNAVAILABLE: null/undefined/NaN/invalid score
 */
const predictTrend = async (trend) => {
  return classifyTrendPotential(trend);  // ligne 76
};
```
Le commentaire est explicite : **"This replaces the external ML service"**.

### Vérification exhaustive des appels HTTP

**Recherche de tout appel HTTP vers localhost:5000 ou localhost:5001 dans `backend/services/`** :
```
Aucun résultat pour "localhost:5000", "localhost:5001", "127.0.0.1:5000", "127.0.0.1:5001"
```

Les seuls appels `axios` dans `backend/services/` sont :
- `aiService.js` → `openrouter.ai` (OpenAI GPT-3.5)
- `aiServiceGroq.js` → `api.groq.com`
- `googleTrendsService.js` → `serpapi.com`
- `mediaExtractor.js` → `openverse.org`, et fetch OpenGraph d'URLs de tendances
- `redditApi.js` → `oauth.reddit.com`, `reddit.com/api/v1/access_token`
- `redditRss.js` → `reddit.com/r/.../.rss`

**Aucun appel vers un serveur Flask, aucun appel vers un endpoint `/predict`**.

➡ **Conclusion : Le fichier `ml-model/models/trend_predictor.pkl` n'est jamais chargé par le backend. Le serveur Flask n'est jamais contacté.**

---

## Question 2 : Quels fichiers l'appellent ?

**Aucun fichier n'appelle le modèle Flask.**

La chaîne d'appels ML réelle est :

```
                  trendService.js
                  saveTrends() (l.487)
                       │
                       ▼
                  mlService.js
                  predictTrend(trend) (l.66)
                       │
                       ▼
                  potentialClassifier.js
                  classifyTrendPotential(trend) (l.22)
                       │
                       ▼
                  if (score >= 70) → 'HIGH'
                  else             → 'LOW'
```

**Tous les appels à `predictTrend` dans le code :**

| Fichier | Ligne | Contexte |
|---------|-------|----------|
| `feedController.js` | 14 | `const { predictTrend } = require("../services/mlService")` |
| `feedController.js` | 53 | `refreshRedditPrediction()` |
| `feedController.js` | 170 | `trends.map((trend) => predictTrend(trend))` |
| `feedController.js` | 312 | `analyzeTrend()` — cas analyse stockée |
| `feedController.js` | 386 | `analyzeTrend()` — cas nouvelle analyse |
| `trendService.js` | 12 | `const { predictTrend } = require("./mlService")` |
| `trendService.js` | 487 | `saveTrends()` |
| `trendController.js` | 4 | `const { predictTrend } = require("../services/mlService")` |

Chacun de ces appels aboutit à `mlService.js` → `potentialClassifier.js` → règle `score >= 70`.

---

## Question 3 : Quels endpoints l'utilisent ?

**Aucun endpoint n'utilise le modèle Flask. Les endpoints utilisent le classifieur interne.**

Endpoints qui retournent `ml_prediction` dans leur réponse JSON :

| Endpoint | Fichier | Source de `ml_prediction` |
|----------|---------|--------------------------|
| `GET /api/feed` | `feedController.js:137,207` | `refreshRedditPrediction(trend)` → `potentialClassifier` |
| `GET /api/feed/:id` | `feedController.js:266` | `safePredictionValue(trend.ml_prediction)` (lecture MongoDB) |
| `POST /api/feed/:id/analyze` | `feedController.js:386` | `predictTrend(trend)` → `potentialClassifier` |
| `GET /api/trends` | `trendController.js:62` | `predictTrend(scoredTrends[i])` → `potentialClassifier` |

**Tous** passent par `mlService.js` → `potentialClassifier.js`.

---

## Question 4 : Existe-t-il un appel HTTP vers Flask ?

**🔴 NON. Aucun appel HTTP vers Flask.**

Preuve : la recherche de `localhost:5000`, `localhost:5001`, `predict`, `flask`, `python`, `ml-model` dans `backend/services/`, `backend/controllers/`, `backend/middleware/` ne trouve **aucune** référence à un endpoint HTTP de ML.

Les seules références à `localhost:5000` dans le dépôt sont dans `backend/scripts/` (scripts de test/audit qui appellent l'API Express du backend, pas le Flask) :
- `end_to_end_production_audit.js:17`
- `prod_audit.js:14`
- `test_connectivity.js:5`

---

## Question 5 : Existe-t-il un fallback qui remplace le modèle ?

**🔴 OUI, et ce fallback est le seul mécanisme utilisé en production.**

Le "fallback" est le classifieur interne `potentialClassifier.js`. Il n'y a **pas** de mécanisme qui tente d'abord d'appeler Flask puis tombe sur le classifieur. Le classifieur est la seule implémentation.

```js
// mlService.js:7 — seule dépendance
const { classifyTrendPotential } = require("./potentialClassifier");
```

Le commentaire dans `mlService.js:57-61` confirme que ce classifieur interne **remplace volontairement** le service ML externe.

Il existe aussi un fichier `featureGeneratorReal.js` qui contient un système de scoring hybride (lignes 99-172 : pondération growth/popularity/sentiment/title). Mais :

```
Recherche de "featureGeneratorReal" dans tout backend/ : Aucun résultat
```

**`featureGeneratorReal.js` n'est importé par aucun fichier. C'est un fichier mort.**

---

## Question 6 : La prédiction affichée dans le frontend provient-elle du modèle entraîné ou d'une règle métier basée sur le score ?

**🔴 La prédiction affichée provient d'une règle métier basée sur le score, mais le frontend ment en affichant "Random Forest".**

### Ce que le backend calcule réellement

**Fichier** : `backend/services/potentialClassifier.js:39-46`
```js
if (score >= 70) {
    classification = 'HIGH';
    confidence = 0.85;
    reasoning.push(`Score ${score} is >= 70 threshold`);
} else {
    classification = 'LOW';
    confidence = 0.70;
    reasoning.push(`Score ${score} is < 70 threshold`);
}
```

C'est une règle **purement métier** : `score >= 70 → HIGH`. Pas de modèle ML, pas de prédiction probabiliste, pas de features.

### Ce que le frontend affiche

**Fichier** : `frontend/src/pages/AIWorkspace.jsx:92-94`
```jsx
if (v === 'HIGH') return '🔥 HIGH POTENTIAL\nLe modèle Random Forest estime un fort potentiel de traction.';
if (v === 'LOW') return '📉 LOW POTENTIAL\nLe modèle Random Forest estime un potentiel limité.';
return 'Prédiction indisponible. Le modèle n\'a pas pu produire de résultat.';
```

**Fichier** : `frontend/src/pages/AIWorkspace.jsx:207`
```jsx
{trend.ml_prediction === 'HIGH'
  ? 'Le modèle Random Forest estime un fort potentiel de traction.'
  : trend.ml_prediction === 'LOW'
    ? 'Le modèle Random Forest estime un potentiel limité.'
    : 'Le modèle Random Forest n\'a pas pu produire de prédiction.'}
```

**Fichier** : `frontend/src/pages/AIWorkspace.jsx:209`
```jsx
<strong>Modèle :</strong> Random Forest
```

### Contradiction

| Niveau | Affirme | Réalité |
|--------|---------|---------|
| Backend (`potentialClassifier.js`) | `score >= 70 → HIGH` | Règle simple, pas de Random Forest |
| Backend (`featureGeneratorReal.js`) | Scoring hybride pondéré | **Fichier mort** — jamais importé |
| Frontend (`AIWorkspace.jsx:207,209`) | "Random Forest" | Aucun Random Forest n'est exécuté |
| ML Model (`ml-model/train.py`) | Random Forest avec GridSearch | **Jamais connecté au backend** |

**Le message "Random Forest" est un texte statique codé en dur dans le frontend qui ne correspond à aucun code backend en exécution.**

---

## Résumé — Chaîne réelle de décision ML

```
                  ┌──────────────────────┐
                  │   scoreTrends()       │ ← calcule score (35-95)
                  │   trendService.js     │
                  └──────────┬───────────┘
                             │ score (Number)
                             ▼
                  ┌──────────────────────┐
                  │   predictTrend()      │ ← mlService.js
                  │   potentialClassifier │
                  └──────────┬───────────┘
                             │ classification: 'HIGH' | 'LOW' | 'UNAVAILABLE'
                             ▼
                  ┌──────────────────────┐
                  │   MongoDB             │ ← stocke ml_prediction
                  └──────────┬───────────┘
                             │ lecture
                             ▼
                  ┌──────────────────────┐
                  │   API Response        │ ← feedController retourne ml_prediction
                  └──────────┬───────────┘
                             │ JSON: { ml_prediction: "HIGH" }
                             ▼
                  ┌──────────────────────┐
                  │   Frontend            │ ← TrendDetail.jsx / AIWorkspace.jsx
                  │                       │    affiche "HIGH POTENTIAL"
                  │                       │    + texte "Random Forest" (FAUX)
                  └──────────────────────┘
```

**Le modèle `ml-model/models/trend_predictor.pkl` est un artefact orphelin. Le backend utilise une règle `score >= 70`. Le frontend affiche "Random Forest" de manière trompeuse.**

---

## Schéma — Ce qui devrait être vs Ce qui est

```
CE QUI EST DOCUMENTÉ (mais pas réel) :
  ml-model/train.py ──entraîne──► trend_predictor.pkl ──serveur Flask──► backend ──► frontend
                                                                 port:5001

CE QUI EST RÉEL :
  trendService.js ──calcule──► score ──potentialClassifier──► "HIGH"/"LOW" ──► frontend
                               (règle: >= 70)                      ↑
                                                                    └─ affiche "Random Forest" (faux)
```
