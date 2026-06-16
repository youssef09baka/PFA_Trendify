# AI Trend Predictor

## Présentation du projet

AI Trend Predictor est une plateforme intelligente développée dans le cadre du Projet de Fin d'Année (PFA) à l'ESISA.

L'objectif du projet est d'aider les créateurs de contenu, entrepreneurs et professionnels du marketing à identifier rapidement les tendances émergentes à partir de plusieurs sources de données telles que Reddit et Google Trends.

La plateforme collecte automatiquement les tendances, les analyse, les classe selon leur potentiel et génère des analyses assistées par intelligence artificielle afin d'aider les utilisateurs à mieux comprendre les opportunités associées à chaque sujet.

---

## Problématique

Aujourd'hui, les tendances évoluent très rapidement sur Internet. Les informations sont dispersées sur plusieurs plateformes et il devient difficile d'identifier les sujets réellement porteurs.

Notre objectif était donc de concevoir une solution capable de :

* Collecter des tendances depuis différentes sources.
* Nettoyer et filtrer les données récupérées.
* Évaluer automatiquement leur pertinence.
* Fournir une analyse claire et exploitable.
* Présenter les résultats dans une interface simple et personnalisée.

---

## Fonctionnalités principales

### Authentification sécurisée

* Création de compte
* Connexion utilisateur
* Authentification JWT
* Protection des routes privées

### Collecte de données

* Intégration Reddit
* Intégration Google Trends
* Fusion des données provenant de plusieurs sources

### Traitement des tendances

* Nettoyage des données
* Suppression des doublons
* Système de scoring
* Classification du potentiel des tendances

### Analyse IA

* Analyse automatique des tendances
* Génération d'opportunités business
* Génération d'idées de contenu
* Interprétation du potentiel de croissance

### Expérience utilisateur

* Feed personnalisé
* Sauvegarde des tendances
* Préférences utilisateur
* Consultation détaillée des tendances

---

## Architecture générale

Le projet est composé de trois parties principales :

### Frontend

Application web développée avec :

* React
* Vite
* CSS

### Backend

API REST développée avec :

* Node.js
* Express.js
* JWT

### Base de données

* MongoDB Atlas
* Mongoose

### Services externes

* Reddit
* Google Trends
* OpenRouter

---

## Fonctionnement général

1. Les données sont récupérées depuis Reddit et Google Trends.
2. Les tendances sont nettoyées et filtrées.
3. Un score est attribué à chaque tendance selon plusieurs critères.
4. Le système classe les tendances selon leur potentiel.
5. L'utilisateur consulte les tendances dans son feed personnalisé.
6. Une analyse IA peut être générée pour obtenir davantage d'informations sur la tendance sélectionnée.

---

## Structure du projet

```text
PFA_V1
│
├── backend
│   ├── controllers
│   ├── services
│   ├── routes
│   ├── middleware
│   └── models
│
├── frontend
│   ├── pages
│   ├── components
│   ├── services
│   └── utils
│
├── docs
│
└── README.md
```

---

## Installation

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Variables d'environnement

Créer un fichier `.env` dans le backend :

```env
MONGO_URI=
JWT_SECRET=
OPENROUTER_API_KEY=
```

---

## Équipe du projet

### MAKHOUKH Youssef

**Chef de projet & Développeur Backend**

Responsabilités :

* Architecture backend
* Développement des API
* Authentification JWT
* Gestion du feed
* Intégration IA
* Optimisation du système

### BOUHLAL Mouad

**Data Engineer**

Responsabilités :

* Intégration Reddit
* Intégration Google Trends
* Collecte des données
* Nettoyage et filtrage
* Pipeline de scoring

### BENKELTOUM Abdessalam

**Développeur Frontend**

Responsabilités :

* Développement de l'interface utilisateur
* Intégration Frontend / Backend
* Expérience utilisateur
* Pages et composants React

---

## Perspectives d'amélioration

Plusieurs évolutions peuvent être envisagées :

* Ajout de nouvelles sources de données
* Notifications en temps réel
* Amélioration du système de prédiction
* Tableau de bord analytique avancé
* Déploiement SaaS complet

---

## Conclusion

AI Trend Predictor est une plateforme de veille intelligente permettant d'identifier, d'analyser et d'exploiter les tendances émergentes provenant de différentes sources de données.

Ce projet nous a permis de mettre en pratique des compétences en développement web, traitement de données, intégration d'API, intelligence artificielle et gestion de projet dans un contexte réel.
