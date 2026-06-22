# Trendify

Trendify est une plateforme de veille, de détection et d'analyse de tendances développée dans le cadre du Projet de Fin d'Année (PFA).

L'objectif du projet est de collecter des tendances issues de différentes sources web, de les nettoyer, les analyser, les classer et les présenter à l'utilisateur sous forme d'un feed personnalisé enrichi par l'intelligence artificielle.

Trendify permet à un utilisateur de découvrir des sujets émergents, comprendre leur potentiel, identifier des opportunités et générer des idées exploitables grâce à l'IA.

---

# Objectif

Les tendances évoluent rapidement et les signaux utiles sont dispersés sur plusieurs plateformes.

Trendify centralise ces informations et les transforme en données exploitables afin de :

* identifier les sujets émergents ;
* comprendre pourquoi une tendance est populaire ;
* détecter des opportunités business ;
* générer des idées de contenu ;
* personnaliser l'expérience utilisateur ;
* assister la prise de décision grâce à l'IA.

---

# Fonctionnalités

## Authentification

* inscription utilisateur ;
* connexion utilisateur ;
* authentification JWT ;
* routes privées protégées ;
* gestion des profils ;
* gestion des préférences utilisateur ;
* quota quotidien d'analyses IA.

---

## Collecte et Feed

Trendify collecte des tendances depuis plusieurs sources externes :

* collecte de tendances Reddit via flux publics disponibles ;
* collecte Google Trends via SerpAPI ;
* nettoyage des données ;
* validation du format des tendances ;
* suppression des doublons ;
* fusion des sources ;
* calcul d'un score de tendance ;
* stockage MongoDB ;
* génération d'un feed personnalisé ;
* pagination des résultats ;
* filtrage selon les préférences utilisateur.

---

## Pipeline de Données

Chaque tendance suit le pipeline suivant :

1. Collecte depuis Reddit ;
2. Collecte depuis Google Trends ;
3. Nettoyage des données ;
4. Validation du format ;
5. Suppression des doublons ;
6. Fusion des résultats ;
7. Calcul du score de tendance ;
8. Évaluation de crédibilité ;
9. Stockage MongoDB ;
10. Personnalisation du feed ;
11. Analyse IA à la demande.

Ce pipeline garantit une structure homogène et cohérente des données avant leur exploitation par les différents modules de l'application.

---

## Recherche

Trendify propose une recherche avancée permettant de rechercher dans :

* le titre ;
* les tags ;
* la catégorie ;
* l'extrait ;
* le lien.

Les résultats sont classés selon leur pertinence avant d'être triés par score.

---

## Analyse IA

Trendify permet de générer des analyses stratégiques à la demande.

Fonctionnalités :

* analyse du potentiel d'une tendance ;
* explication de la popularité d'un sujet ;
* génération d'idées de contenu ;
* génération d'idées business ;
* synthèse stratégique.

Caractéristiques :

* fournisseur IA : Groq ;
* modèle configurable via variable d'environnement ;
* aucune analyse n'est stockée de manière permanente ;
* aucun fallback local simulé ;
* en cas d'indisponibilité du fournisseur IA, une erreur explicite est retournée à l'utilisateur.

---

## Trendi

Trendi est l'assistant intelligent intégré à Trendify.

Il utilise les tendances disponibles dans MongoDB pour répondre comme un analyste stratégique spécialisé dans les tendances.

Fonctionnalités :

* recommandations de tendances ;
* comparaison de tendances ;
* génération d'idées business ;
* génération d'idées de contenu ;
* assistance à la recherche ;
* réponses vocales via SpeechSynthesis ;
* dictée vocale via Web Speech API lorsque le navigateur le supporte.

---

## Évaluation de Crédibilité

Trendify ajoute une couche d'évaluation de crédibilité à chaque tendance.

Les informations calculées comprennent :

* score de crédibilité ;
* niveau de confiance ;
* statut de vérification ;
* sources reconnues lorsqu'elles sont disponibles ;
* détection de signaux à risque ;
* indicateurs de vérification.

Important :

Trendify n'est pas un système complet de fact-checking.

L'objectif est d'éviter de présenter une information comme vérifiée lorsqu'aucune preuve fiable n'est disponible.

---

## Favoris

L'utilisateur peut :

* sauvegarder une tendance ;
* retirer une tendance des favoris ;
* consulter ses tendances sauvegardées ;
* retrouver rapidement les tendances importantes.

---

## Profil Utilisateur

Le profil utilisateur permet :

* la gestion des préférences ;
* la personnalisation du feed ;
* la gestion du thème ;
* la consultation des informations du compte.

---

# Architecture

```text
Frontend (React + Vite)
          |
          | HTTP REST API
          v
Backend (Node.js + Express)
          |
          | Mongoose
          v
MongoDB Atlas

Sources externes
----------------
- Reddit
- Google Trends (SerpAPI)
- Groq API
```

---

# Structure du Projet

```text
PFA_V1/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── test/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── utils/
│
├── ml-model/
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# Stack Technique

## Backend

* Node.js
* Express
* MongoDB
* Mongoose
* JWT
* Helmet
* CORS
* Express Rate Limit
* Express Mongo Sanitize
* Axios

---

## Frontend

* React
* Vite
* React Router
* Lucide React
* Three.js
* CSS Responsive

---

## Intelligence Artificielle

* Groq API
* Modèle configurable via GROQ_MODEL

---

## Base de Données

* MongoDB Atlas
* Mongoose
* Index MongoDB optimisés pour :

  * score ;
  * date ;
  * catégorie ;
  * recherche ;
  * crédibilité.

---

# Module ML

Le dossier `ml-model/` contient un prototype de prédiction développé à partir de données historiques Reddit.

Ce module a été réalisé dans le cadre de l'étude d'un système de prédiction du potentiel de viralité des tendances à l'aide de techniques de Machine Learning.

Le modèle a été entraîné sur un dataset Reddit contenant différents indicateurs d'engagement et a permis d'expérimenter plusieurs approches de classification.

Le module constitue une preuve de faisabilité technique et une piste d'évolution future du projet.

L'application principale utilise actuellement un système de scoring explicable basé sur des indicateurs de popularité, croissance, pertinence et crédibilité afin de garantir un comportement stable et interprétable.

---

# Installation

## Prérequis

* Node.js 20+
* npm
* MongoDB Atlas ou MongoDB local
* Clé Groq
* Clé SerpAPI

---

## Variables d'Environnement

Créer un fichier `.env` à partir de `.env.example`.

Exemple :

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
GROQ_API_KEY=gsk_xxxxx
GROQ_MODEL=llama-3.3-70b-versatile
SERPAPI_KEY=xxxxx
FRONTEND_URL=http://localhost:4173
PORT=3000
```

Ne jamais publier les vraies clés API.

---

# Commandes

## Depuis la racine

```bash
npm run dev:backend
npm run dev:frontend

npm test
npm run lint
npm run build
```

## Backend

```bash
cd backend

npm install
npm run dev
npm start
npm test
```

## Frontend

```bash
cd frontend

npm install
npm run dev
npm run lint
npm run build
npm run preview
```

---

# API Principale

| Route                       | Auth | Description                 |
| --------------------------- | ---- | --------------------------- |
| POST /api/users/signup      | Non  | Création d'un compte        |
| POST /api/users/login       | Non  | Connexion                   |
| GET /api/users/profile      | Oui  | Profil utilisateur          |
| PUT /api/users/preferences  | Oui  | Mise à jour des préférences |
| GET /api/users/saved-trends | Oui  | Favoris                     |
| GET /api/feed               | Oui  | Feed personnalisé           |
| GET /api/feed/search        | Oui  | Recherche                   |
| GET /api/feed/:id           | Oui  | Détail tendance             |
| POST /api/feed/:id/analyze  | Oui  | Analyse IA                  |
| POST /api/feed/:id/save     | Oui  | Ajouter aux favoris         |
| DELETE /api/feed/:id/save   | Oui  | Retirer des favoris         |
| POST /api/assistant/chat    | Oui  | Assistant Trendi            |

---

# Tests et Validation

Validation finale :

```text
npm test       PASS
npm run lint   PASS
npm run build  PASS
```

Le build frontend peut afficher un avertissement concernant la taille du bundle Vite. Cet avertissement n'empêche pas le fonctionnement de l'application.

---

# Équipe

## MAKHOUKH Youssef

Chef de projet, développeur backend et intégration IA.

Responsabilités :

* architecture backend ;
* API Express ;
* authentification JWT ;
* gestion du feed ;
* intégration IA ;
* optimisation des performances ;
* coordination du projet.

---

## BOUHLAL Mouad

Data Engineer.

Responsabilités :

* collecte Reddit ;
* collecte Google Trends ;
* nettoyage des données ;
* pipeline de traitement ;
* scoring des tendances ;
* vérification des sources.

---

## BENKELTOUM Abdessalam

Développeur Frontend.

Responsabilités :

* interface React ;
* expérience utilisateur ;
* navigation ;
* intégration API ;
* responsive design.

---

# Conclusion

Trendify est une plateforme complète de détection, d'analyse et de personnalisation de tendances.

Le projet combine collecte de données multi-sources, traitement backend, stockage MongoDB, système de scoring, évaluation de crédibilité, intelligence artificielle générative et assistant conversationnel spécialisé.

Grâce à son architecture modulaire et à son pipeline de traitement des données, Trendify transforme des signaux web bruts en informations exploitables pour les créateurs de contenu, entrepreneurs, analystes et décideurs.

Le projet est prêt pour une démonstration académique complète intégrant collecte de données, traitement, personnalisation, intelligence artificielle et analyse de tendances en temps réel.
