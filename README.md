# Trendify

Trendify est une plateforme de veille et d'analyse de tendances développée dans le cadre du Projet de Fin d'Année.

Le projet aide un utilisateur à découvrir des tendances issues de Reddit et Google Trends, à les filtrer selon ses préférences, à sauvegarder les plus intéressantes et à générer des analyses stratégiques avec IA.

## Objectif

Les tendances évoluent rapidement et les signaux utiles sont dispersés entre plusieurs sources. Trendify centralise ces signaux et les transforme en informations exploitables pour :

- identifier les sujets émergents ;
- comprendre pourquoi une tendance monte ;
- détecter des opportunités business ;
- générer des idées de contenu ;
- personnaliser le flux selon les préférences utilisateur ;
- interagir avec un assistant intelligent spécialisé, Trendi.

## Fonctionnalités

### Authentification

- inscription et connexion utilisateur ;
- authentification JWT ;
- routes privées protégées ;
- quota quotidien d'analyses IA.

### Collecte et feed

- collecte Reddit RSS ;
- collecte Google Trends via SerpAPI ;
- nettoyage et normalisation des tendances ;
- suppression des doublons ;
- scoring des tendances ;
- persistance MongoDB ;
- feed paginé ;
- filtrage strict selon les préférences utilisateur.

### Recherche

- page de recherche dédiée ;
- recherche dans le titre, les tags, la catégorie, l'extrait et le lien ;
- classement par pertinence de recherche avant le score brut.

### Analyse IA

- génération d'un rapport stratégique à la demande ;
- fournisseur IA actuel : Groq ;
- aucune analyse IA stockée de manière permanente dans MongoDB ;
- aucun fallback local simulé : si Groq est indisponible, l'interface affiche une erreur claire.

### Trendi

Trendi est l'assistant intelligent de Trendify.

Il utilise les tendances disponibles dans MongoDB pour répondre comme un analyste stratégique :

- recommandations de tendances ;
- idées business ;
- idées de contenu ;
- comparaison de signaux ;
- réponses vocales via `speechSynthesis` navigateur ;
- dictée via Web Speech API lorsque le navigateur la supporte.

### Crédibilité

Trendify ajoute une couche d'évaluation de crédibilité à chaque tendance :

- score de crédibilité ;
- niveau de confiance ;
- statut de vérification ;
- sources reconnues lorsqu'elles sont disponibles ;
- détection de signaux à risque dans les titres et métadonnées.


### Favoris et profil

- sauvegarde et suppression de tendances favorites ;
- page favoris ;
- page profil ;
- gestion des préférences ;
- thème clair/sombre depuis le profil.

## Architecture

```text
frontend/ React + Vite
    |
    | HTTP /api
    v
backend/ Node.js + Express
    |
    | Mongoose
    v
MongoDB Atlas

Sources externes:
- Reddit
- Google Trends / SerpAPI
- Groq pour les analyses IA
```

## Structure

```text
PFA_V1/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   `-- test/
|-- frontend/
|   |-- public/
|   `-- src/
|       |-- api/
|       |-- components/
|       |-- context/
|       |-- pages/
|       `-- utils/
|-- ml-model/
|-- docker-compose.yml
|-- package.json
`-- README.md
```

## Stack technique

### Backend

- Node.js
- Express
- MongoDB / Mongoose
- JWT
- Helmet
- CORS
- Express Rate Limit
- Express Mongo Sanitize
- Axios

### Frontend

- React
- Vite
- React Router
- Lucide React
- Three.js
- CSS moderne responsive

### IA

- Groq API
- Modèle configurable avec `GROQ_MODEL`

### Base de données

- MongoDB Atlas
- Mongoose
- indexes définis dans le modèle `Trend`

## Module ML

Le dossier `ml-model/` contient un module de prédiction expérimental basé sur des données historiques.

Ce module complète la partie data du projet et illustre une approche de classification du potentiel des tendances. L'application principale utilise un système de scoring explicable pour classer les tendances collectées et les présenter dans le feed.

## Installation

### Prérequis

- Node.js 20 ou plus
- npm
- MongoDB Atlas ou MongoDB local
- clé Groq
- clé SerpAPI si Google Trends est activé

### Variables d'environnement

Copier `.env.example` et créer un `.env` dans le backend.

Variables minimales :

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=un-secret-long-et-aleatoire
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
SERPAPI_KEY=...
FRONTEND_URL=http://localhost:4173
PORT=3000
```

Ne jamais committer les vraies clés API.

## Commandes

Depuis la racine :

```bash
npm run dev:backend
npm run dev:frontend
npm test
npm run lint
npm run build
```

Backend uniquement :

```bash
cd backend
npm install
npm run dev
npm start
npm test
```

Frontend uniquement :

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## API principale

| Route | Auth | Description |
|-------|------|-------------|
| `POST /api/users/signup` | Non | Créer un compte |
| `POST /api/users/login` | Non | Connexion |
| `GET /api/users/profile` | Oui | Profil utilisateur |
| `PUT /api/users/preferences` | Oui | Mise à jour des préférences |
| `GET /api/users/saved-trends` | Oui | Tendances sauvegardées |
| `GET /api/feed` | Oui | Feed personnalisé |
| `GET /api/feed/search` | Oui | Recherche dédiée |
| `GET /api/feed/:id` | Oui | Détail d'une tendance |
| `POST /api/feed/:id/analyze` | Oui | Générer une analyse IA |
| `POST /api/feed/:id/save` | Oui | Sauvegarder une tendance |
| `DELETE /api/feed/:id/save` | Oui | Retirer une tendance sauvegardée |
| `POST /api/assistant/chat` | Oui | Assistant Trendi |

## Tests et validation

État final validé :

```text
npm test       PASS
npm run lint   PASS
npm run build  PASS
```

Le build frontend peut afficher un avertissement Vite sur la taille du bundle. Cet avertissement n'empêche pas le build.


## Équipe

### MAKHOUKH Youssef

Chef de projet, développeur backend et intégration IA.

Responsabilités :

- architecture backend ;
- API Express ;
- authentification JWT ;
- feed ;
- intégration IA ;
- optimisation performance.

### BOUHLAL Mouad

Data engineer.

Responsabilités :

- collecte Reddit ;
- collecte Google Trends ;
- nettoyage des données ;
- pipeline de scoring ;
- audit des sources.

### BENKELTOUM Abdessalam

Développeur frontend.

Responsabilités :

- interface React ;
- expérience utilisateur ;
- navigation ;
- pages produit ;
- intégration API.

## Conclusion

Trendify est une plateforme complète de détection, scoring, personnalisation et analyse de tendances. Le projet combine collecte de données, traitement backend, interface moderne, analyse IA et assistant intelligent pour transformer des signaux web en informations exploitables.
