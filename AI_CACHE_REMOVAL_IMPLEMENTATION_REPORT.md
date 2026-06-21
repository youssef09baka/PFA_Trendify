# AI Cache Removal Implementation Report

Date: 2026-06-21

## Objectif

Supprimer uniquement la réutilisation des analyses stockées dans `POST /api/feed/:id/analyze`.

Comportement attendu après modification:

- `generateTrendAnalysis()` est toujours exécuté quand l'utilisateur clique sur "Analyser avec IA".
- La réponse retourne toujours une analyse fraîche issue du provider IA actif.
- Les champs `Trend.analysis` et `Trend.idea` sont conservés et continuent d'être persistés pour le feed et les détails.
- Le système de quota IA reste inchangé.

## Fichiers modifiés

### `backend/controllers/feedController.js`

Modifications effectuées:

- Suppression de `FALLBACK_CACHE_PATTERNS`.
- Suppression de `hasRealStoredAnalysis()`.
- Suppression de la branche `hasStoredAnalysis`.
- Suppression de la branche `canReuseStoredAnalysis`.
- Suppression du retour `status: "stored"`.

Preuve dans le code actuel:

- `analyzeTrend()` commence à `backend/controllers/feedController.js:267`.
- La tendance est chargée via `getTrendById(id)` à `backend/controllers/feedController.js:275`.
- Le quota est toujours réservé avant génération via `User.findOneAndUpdate(...)` à `backend/controllers/feedController.js:290`.
- `generateTrendAnalysis(trend)` est appelé sans condition de cache à `backend/controllers/feedController.js:308`.
- `Trend.analysis` et `Trend.idea` sont toujours persistés à `backend/controllers/feedController.js:317` puis `backend/controllers/feedController.js:322`.
- La réponse renvoie `analysis.status` depuis le résultat généré à `backend/controllers/feedController.js:356`.

Diff:

- `backend/controllers/feedController.js`: 69 lignes modifiées, branche de cache supprimée.

### `backend/test/analyzeTrend.test.js`

Modifications effectuées:

- Le test qui vérifiait la réutilisation du cache vérifie maintenant l'inverse.
- Une tendance avec `analysis` et `idea` existants doit appeler OpenRouter.

Preuve dans le test actuel:

- Test: `analyzeTrend always regenerates analysis even when stored values exist` à `backend/test/analyzeTrend.test.js:109`.
- Vérifie `state.generateCalls === 1` à `backend/test/analyzeTrend.test.js:113`.
- Vérifie `state.reservedQuotaCalls === 1` à `backend/test/analyzeTrend.test.js:114`.
- Vérifie `res.body.analysis.status === "openrouter"` à `backend/test/analyzeTrend.test.js:116`.
- Le test fallback vérifie que le statut n'est pas `stored` à `backend/test/analyzeTrend.test.js:127`.

Diff:

- `backend/test/analyzeTrend.test.js`: test mis à jour pour verrouiller le nouveau comportement.

## Elements conserves

Non modifiés:

- `Feed.jsx`
- `TrendDetail.jsx`
- Schema MongoDB `Trend`
- Système de quota IA
- `generateTrendAnalysis()`

Champs conservés:

- `Trend.analysis`
- `Trend.idea`

Ces champs restent mis à jour après génération fraîche:

- `analysis: persistedAnalysis`
- `idea: persistedIdea`

## Validation 1 - npm test

Commande:

```bash
cd backend
npm test
```

Résultat:

```text
tests 7
pass 7
fail 0
duration_ms 3026.0334
```

Tests pertinents:

```text
PASS analyzeTrend always regenerates analysis even when stored values exist
PASS analyzeTrend regenerates analysis when old fallback values exist
PASS analyzeTrend reserves AI quota atomically and returns updated balance
```

## Validation 2 - npm run build

Commande:

```bash
cd frontend
npm run build
```

Résultat:

```text
vite v8.0.14 building client environment for production...
✓ 1821 modules transformed.
✓ built in 2.32s
```

## Validation 3 - Tendance déjà analysée

Tendance MongoDB utilisée:

```text
_id: 6a14fb1f008f2ed2f1b4a267
title: Pope Leo Issues AI Encyclical Warning That Opaque Algorithms Controlled by a Few Companies Can Bring New Forms of Dehumanisation
source: Reddit
category: reddit
```

Etat avant appel:

```text
analysis: Pope Leo's warning about opaque algorithms controlled by a few companies leading to dehumanization is trending as it raises important ethical concerns about AI.
idea: Launch a podcast discussing the ethical implications of AI in society and its impact on human life.
```

Ce cas valide que la tendance possédait déjà une ancienne analyse stockée.

Endpoint testé:

```http
POST /api/feed/6a14fb1f008f2ed2f1b4a267/analyze
Authorization: Bearer <JWT validation user>
```

Résultat runtime:

```json
{
  "elapsedMs": 4098,
  "status": "openrouter",
  "businessOpportunitiesCount": 3,
  "contentIdeasCount": 3,
  "aiRemaining": 999
}
```

Preuve que l'ancienne analyse stockée n'a pas été réutilisée:

- Avant appel: analyse stockée en anglais.
- Après appel: réponse fraîche en français.
- Statut retourné: `openrouter`.
- Quota consommé: `aiRemaining` passe à `999` pour l'utilisateur de validation.

Extrait de réponse fraîche:

```text
Résumé: Le Pape Léo met en garde contre les algorithmes opaques contrôlés par quelques entreprises...
Opportunité: Une opportunité clé réside dans le développement de solutions d'intelligence artificielle transparentes...
```

## Recherche de references restantes

Commande:

```bash
rg -n "hasStoredAnalysis|canReuseStoredAnalysis|hasRealStoredAnalysis|FALLBACK_CACHE_PATTERNS" backend/controllers backend/test frontend/src -S
```

Résultat:

```text
Aucune occurrence.
```

Commande:

```bash
rg -n "stored" backend/controllers backend/test frontend/src -S
```

Occurrences restantes:

- `backend/controllers/feedController.js`: uniquement pour les tendances stockées du feed, sans rapport avec l'analyse IA.
- `backend/test/analyzeTrend.test.js`: uniquement dans les noms/messages de tests et dans l'assertion `notEqual(..., "stored")`.

## Validation finale

Conclusion:

```text
POST /api/feed/:id/analyze ne réutilise plus les analyses stockées.
```

Le nouveau comportement est validé:

- Une tendance déjà analysée déclenche une nouvelle génération.
- `status = "openrouter"` est retourné.
- `businessOpportunities` contient 3 éléments.
- `contentIdeas` contient 3 éléments.
- Le quota IA reste actif.
- `Trend.analysis` et `Trend.idea` restent conservés et persistés.
- Aucun fichier frontend demandé comme non modifiable n'a été modifié.
