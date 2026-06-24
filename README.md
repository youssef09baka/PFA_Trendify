# Trendify

Trendify est une application web de veille de tendances developpee pour un Projet de Fin d'Annee. Elle collecte des signaux depuis Reddit et Google Trends, les nettoie, les score, les classe et les affiche dans un feed personnalise. L'application integre aussi des rapports IA a la demande et un assistant produit, Trendi.

## Objectif

Les tendances utiles sont dispersees sur plusieurs plateformes et changent rapidement. Trendify centralise ces signaux pour aider un utilisateur a :

- decouvrir les sujets emergents ;
- filtrer les tendances selon ses preferences ;
- rechercher une tendance precise ;
- sauvegarder les signaux importants ;
- comprendre le potentiel d'une tendance ;
- generer un rapport d'analyse IA ;
- interagir avec Trendi pour naviguer, rechercher et obtenir des conseils.

## Fonctionnalites

- Authentification JWT : inscription, connexion, session utilisateur et routes protegees.
- Feed personnalise : pagination, filtres thematiques, tri et preferences utilisateur.
- Recherche : recherche backend dans les titres, tags, categories et descriptions.
- Favoris : ajout, retrait et consultation des tendances sauvegardees.
- Detail de tendance : score, source, categorie, media, credibility, donnees geographiques Google Trends quand elles existent.
- Rapports IA : generation a la demande via Groq, sans stockage permanent dans MongoDB.
- Assistant Trendi : conversation, recherche, navigation, filtres, changement de theme et mode vocal manuel.
- Collecte de donnees : Reddit RSS/API et Google Trends via SerpAPI pour les tendances principales.
- Carte geographique : interet par region base uniquement sur les donnees reelles Google Trends disponibles.

## Architecture

```text
Frontend React
  |
  | API HTTP avec JWT
  v
Backend Express
  |
  | MongoDB Atlas
  v
Collections User / Trend

Services externes :
- Reddit
- Google Trends / SerpAPI
- Groq pour les analyses IA et Trendi
```

## Stack technique

### Frontend

- React
- Vite
- React Router
- Axios
- Lucide React
- Three.js pour le fond 3D
- react-svg-worldmap pour la carte geographique

### Backend

- Node.js
- Express
- MongoDB / Mongoose
- JWT
- Helmet
- CORS
- Rate limiting
- Mongo sanitize
- RSS Parser
- Google Trends API
- Axios

### IA

- Groq API
- Prompts structures
- Reponses JSON validees
- Aucun fallback local simule

## Pipeline de donnees

```text
Reddit + Google Trends
        |
        v
Nettoyage et validation
        |
        v
Deduplication
        |
        v
Scoring explicable
        |
        v
Credibility check
        |
        v
Persistance MongoDB
        |
        v
Feed / Recherche / Detail / Trendi
```

Le scoring conserve un score original sur la tendance. Les preferences utilisateur servent au filtrage du feed, sans modifier le score original.

## Module ML

Le dossier `ml-model` contient un module experimental conserve pour la presentation du travail realise au debut du projet. Il n'est pas integre au workflow runtime principal de Trendify. Le produit actuel utilise un scoring explicable et stable base sur les donnees disponibles.

## Configuration

Copier le fichier d'exemple :

```bash
cp .env.example backend/.env
```

Puis renseigner les variables necessaires :

- `MONGO_URI`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `SERPAPI_KEY` si la collecte Google Trends principale est utilisee

Les autres variables possedent des valeurs par defaut raisonnables dans le code ou dans `.env.example`.

## Installation

Installer les dependances backend :

```bash
cd backend
npm install
```

Installer les dependances frontend :

```bash
cd frontend
npm install
```

## Lancement en developpement

Backend :

```bash
cd backend
npm run dev
```

Frontend :

```bash
cd frontend
npm run dev
```

Par defaut :

- backend : `http://localhost:5000`
- frontend : URL fournie par Vite

## Scripts utiles

Depuis la racine :

```bash
npm test
npm run lint
npm run build
```

Ou separement :

```bash
cd backend && npm test
cd frontend && npm run lint
cd frontend && npm run build
```

## Variables d'environnement principales

```text
MONGO_URI
PORT
NODE_ENV
FRONTEND_URL
JWT_SECRET
JWT_EXPIRATION
GROQ_API_KEY
GROQ_MODEL
AI_ANALYSIS_QUOTA
SERPAPI_KEY
GOOGLE_TRENDS_LIMIT
TREND_INGEST_LIMIT
TREND_PERSIST_LIMIT
TREND_CACHE_DURATION_MS
REDDIT_FETCH_LIMIT
REDDIT_MAX_RETRIES
REDDIT_DISABLED_SUBREDDITS
REDDIT_USER_AGENT
RATE_LIMIT_MAX
AUTH_RATE_LIMIT_MAX
DEBUG_LOGS
```

## Securite

- Les routes privees sont protegees par JWT.
- Les entrees critiques sont validees cote backend.
- Les erreurs techniques ne sont pas exposees directement a l'utilisateur.
- Les logs de debug sont desactives en production sauf si `DEBUG_LOGS=true`.
- Le fichier `.env` est ignore par Git.

## Validation actuelle

Le projet est valide avec :

- tests backend ;
- lint frontend ;
- build frontend ;
- verification des donnees MongoDB ;
- verification des commandes principales de Trendi.

## Notes de demonstration

Pour une demonstration fluide :

- utiliser un compte avec quelques favoris deja sauvegardes ;
- tester la cle Groq avant la soutenance ;
- eviter de lancer trop de synchronisations Google Trends si le quota SerpAPI est limite ;
- tester le bouton micro de Trendi sur le navigateur et le micro utilises pendant la demo.
