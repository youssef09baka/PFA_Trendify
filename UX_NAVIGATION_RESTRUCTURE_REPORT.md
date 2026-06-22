# UX Navigation Restructure Report

Date: 2026-06-22

## Perimetre

Backend, API, modeles MongoDB, services et logique metier: non modifies.

Cette mission modifie uniquement le frontend.

## Nouvelle structure implementee

### 1. Accueil interne

Fichier cree:

- `frontend/src/pages/Home.jsx`

Route:

- `frontend/src/App.jsx:26` -> `/home`

Contenu:

- presentation rapide de TrendAI;
- resume personnalise;
- tendances les plus chaudes;
- statistiques utilisateur;
- raccourcis rapides vers Explorer, Recherche, Favoris et Profil.

Donnees utilisees:

- `GET /api/feed`
- `GET /api/users/saved-trends`
- `AuthContext.user`

### 2. Explorer

Fichier conserve:

- `frontend/src/pages/Feed.jsx`

Route:

- `frontend/src/App.jsx:31` -> `/feed`

Changement UX:

- le feed n'est plus "Accueil";
- il devient la destination "Explorer";
- le header affiche maintenant "Explorer" et "Feed des tendances";
- la recherche independante ouvre `/feed?focus=search`.

Preuve:

- `frontend/src/pages/Feed.jsx` utilise `useLocation`;
- le champ recherche recoit le focus quand `focus=search` est present.

### 3. Favoris

Fichier cree:

- `frontend/src/pages/Favorites.jsx`

Route:

- `frontend/src/App.jsx:28` -> `/favorites`

Contenu:

- tendances sauvegardees;
- analyses sauvegardees si disponibles via `analysis` ou `idea`;
- recherche;
- filtres Tous / Reddit / Google Trends;
- retrait d'un favori via l'endpoint existant.

Donnees utilisees:

- `GET /api/users/saved-trends`
- `DELETE /api/feed/:id/save`

### 4. Profil

Fichier cree:

- `frontend/src/pages/Profile.jsx`

Route:

- `frontend/src/App.jsx:27` -> `/profile`

Contenu:

- informations utilisateur;
- analyses restantes;
- preferences actives;
- edition des preferences;
- theme clair/sombre;
- statistiques utilisateur simples.

Donnees utilisees:

- `AuthContext.user`
- `PUT /api/users/preferences`
- `ThemeContext`

Compatibilite:

- `frontend/src/App.jsx:29` redirige `/preferences` vers `/profile`.

### 5. Suppression du Tableau de bord

Fichier supprime:

- `frontend/src/pages/Dashboard.jsx`

Route:

- `frontend/src/App.jsx:30` redirige `/dashboard` vers `/home`.

Le tableau de bord n'est plus importe dans `App.jsx`.

## Nouvelle navigation

Fichier modifie:

- `frontend/src/components/Navbar.jsx`

Structure:

- Desktop: sidebar verticale style Instagram avec texte visible.
- Mobile: dock flottant bas avec 5 items.

Items:

- Accueil -> `/home`
- Explorer -> `/feed`
- Recherche -> `/feed?focus=search`
- Favoris -> `/favorites`
- Profil -> `/profile`

Preuves:

- `frontend/src/components/Navbar.jsx:20` definit `navigationItems`.
- `frontend/src/components/Navbar.jsx:46` rend `.app-sidebar`.
- `frontend/src/components/Navbar.jsx:74` rend `.mobile-topbar`.
- `frontend/src/components/Navbar.jsx:84` rend `.app-dock`.

## Recherche independante

Route:

- `/feed?focus=search`

Preuves:

- `frontend/src/components/Navbar.jsx:23`
- `frontend/src/components/Navbar.jsx:79`
- `frontend/src/pages/Home.jsx:103`
- `frontend/src/pages/Home.jsx:166`

Comportement:

- ouvre Explorer;
- donne le focus au champ de recherche du feed.

## Responsive

Fichier:

- `frontend/src/index.css`

Preuves CSS:

- sidebar desktop: `frontend/src/index.css:3450`
- mobile topbar: `frontend/src/index.css:3553`
- layout pages internes: `frontend/src/index.css:3557`
- Home: `frontend/src/index.css:3578`
- Favoris: `frontend/src/index.css:3805`
- Profil: `frontend/src/index.css:3868`
- sidebar cachee mobile: `frontend/src/index.css:4024`
- dock mobile cinq items: `frontend/src/index.css:4073`

## Validations

Build frontend:

```text
cd frontend
npm run build

Resultat: OK
Vite: built in 1.17s
CSS: dist/assets/index-CyDlv0AV.css
JS: dist/assets/index-Bn3kawwr.js
```

Lint frontend:

```text
cd frontend
npm run lint

Resultat: ECHEC
Erreur restante:
frontend/src/utils/media.js:26:7 simpleHash is assigned a value but never used
```

Note:

- l'erreur `simpleHash` existait deja avant cette restructuration;
- `frontend/src/utils/media.js` n'a pas ete modifie dans cette mission;
- l'erreur ajoutee initialement dans `Favorites.jsx` a ete corrigee.

## Captures

Capture authentifiee automatique:

- tentative via Chrome headless + session JWT reelle;
- tentative via Chrome headless + interception API locale;
- les deux methodes se sont bloquees dans l'outillage Chrome headless de l'environnement.

Aucune capture authentifiee finale n'est conservee, afin d'eviter de livrer une capture trompeuse de la page login.

Validation visuelle a completer manuellement dans le navigateur:

- `/home`
- `/feed`
- `/feed?focus=search`
- `/favorites`
- `/profile`

## Conclusion

La structure de navigation est maintenant coherente avec une application quotidienne:

- Accueil donne une vue globale;
- Explorer contient le feed;
- Recherche est un acces direct;
- Favoris devient une vraie page;
- Profil centralise preferences, compte, theme et quota;
- l'ancien Tableau de bord est supprime du runtime frontend.

Le backend et les APIs existantes restent inchanges.
