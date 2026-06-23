# GOOGLE TRENDS GEO MAP REPORT

## Objectif

Ajouter une section dediee `Interet par region` dans la page detail d'une tendance.

La fonctionnalite respecte la contrainte principale :

- aucune donnee simulee
- aucune donnee IA
- aucune estimation
- uniquement les donnees retournees par Google Trends

## Source exacte des donnees

La collecte principale des tendances Google continue d'utiliser SerpAPI pour `google_trends_trending_now`.

La section `Interet par region` n'utilise plus SerpAPI, afin d'eviter la consommation du quota gratuit.

Nouvelle source runtime :

```txt
Package backend : google-trends-api
Methode : interestByRegion()
Endpoint Google Trends utilise par la librairie : /trends/api/widgetdata/comparedgeo
```

Parametres utilises :

```js
{
  keyword: "<query>",
  resolution: "COUNTRY",
  hl: "en-US",
  startTime: now - 7 jours,
  endTime: now
}
```

Important :

- aucun pays n'est invente
- seules les entrees avec `geoCode`, `geoName` et `value > 0` sont conservees
- si Google Trends retourne vide ou echoue, `geoInterest` reste vide
- le resultat est trie par valeur decroissante et limite a 25 pays

## Backend

Fichier modifie :

- `backend/services/data/googleTrendsService.js`

Ajouts / changements :

- remplacement de SerpAPI par `google-trends-api` pour `getInterestByRegion(query)`
- conservation de SerpAPI uniquement pour la collecte `trending_now`
- ajout d'un timeout local de 6000 ms
- normalisation compatible avec :
  - ancien format SerpAPI : `geo`, `location`, `extracted_value`
  - nouveau format Google Trends : `geoCode`, `geoName`, `value: [number]`

Variables :

```txt
GOOGLE_TRENDS_GEO_LIMIT=20 par defaut
GOOGLE_TRENDS_GEO_DAYS=7 par defaut
```

## MongoDB

Fichier modifie :

- `backend/models/Trend.js`

Champ ajoute :

```js
geoInterest: [
  {
    country: String,
    countryCode: String,
    value: Number
  }
]
```

Fichier modifie :

- `backend/services/trendService.js`

`saveTrends()` nettoie les donnees avant stockage :

- `country` obligatoire
- `countryCode` ISO alpha-2 obligatoire
- `value > 0`
- tri decroissant
- maximum 25 pays

## API Detail

Fichier modifie :

- `backend/controllers/feedController.js`

`GET /api/feed/:id` retourne :

```json
{
  "geoInterest": [
    {
      "country": "United States",
      "countryCode": "US",
      "value": 100
    }
  ]
}
```

Si une tendance Google Trends existante n'a pas encore `geoInterest`, le backend tente une recuperation lazy au moment de l'ouverture du detail, puis sauvegarde les donnees reelles obtenues.

## Frontend

Fichiers modifies :

- `frontend/src/pages/TrendDetail.jsx`
- `frontend/src/index.css`
- `frontend/package.json`
- `frontend/package-lock.json`

Dependance ajoutee :

```txt
react-svg-worldmap
```

Section ajoutee :

```txt
Interet par region
```

Position :

- apres score / momentum / statistiques
- avant le contexte et le rapport IA

## Comportement UI

### Tendance Google Trends avec donnees geo

Affiche :

- carte du monde coloree
- intensite selon `value`
- tooltip pays / valeur
- Top 10 pays a droite

### Tendance Google Trends sans donnees geo

Affiche :

```txt
Google Trends n'a pas retourne de donnees geographiques pour cette tendance.
```

### Tendance Reddit

Affiche :

```txt
Les donnees geographiques ne sont pas disponibles pour cette source.
```

Aucune donnee n'est inventee.

## Validation runtime gratuite

Commande runtime executee directement contre `google-trends-api` :

```bash
node -e "getInterestByRegion('Meta Glasses')"
```

Resultat observe pour `Meta Glasses` :

```json
{
  "count": 25,
  "top5": [
    { "country": "United States", "countryCode": "US", "value": 100 },
    { "country": "Pakistan", "countryCode": "PK", "value": 52 },
    { "country": "United Kingdom", "countryCode": "GB", "value": 52 },
    { "country": "Puerto Rico", "countryCode": "PR", "value": 51 },
    { "country": "Canada", "countryCode": "CA", "value": 48 }
  ]
}
```

Resultat observe pour `OpenAI` :

```json
{
  "count": 25,
  "top5": [
    { "country": "China", "countryCode": "CN", "value": 100 },
    { "country": "Ecuador", "countryCode": "EC", "value": 48 },
    { "country": "Singapore", "countryCode": "SG", "value": 28 },
    { "country": "Colombia", "countryCode": "CO", "value": 28 },
    { "country": "Brazil", "countryCode": "BR", "value": 24 }
  ]
}
```

Temps observe :

- `Meta Glasses` : 569 ms
- `OpenAI` : 222 ms

Quota SerpAPI consomme par ces deux validations :

```txt
0 appel SerpAPI
```

## Tests automatises

Commande :

```bash
node --test test/googleTrendsGeo.test.js
```

Resultat :

- 2 tests passes
- 0 echec

Tests couverts :

- normalisation des donnees geo reelles
- compatibilite avec le format `google-trends-api`
- extraction du query depuis un lien Google Trends

## Fichiers modifies

- `backend/package.json`
- `backend/package-lock.json`
- `backend/services/data/googleTrendsService.js`
- `backend/test/googleTrendsGeo.test.js`

Fichiers deja lies a la fonctionnalite :

- `backend/models/Trend.js`
- `backend/services/trendService.js`
- `backend/controllers/feedController.js`
- `frontend/src/pages/TrendDetail.jsx`
- `frontend/src/index.css`
- `frontend/package.json`
- `frontend/package-lock.json`

## Limites restantes

- `google-trends-api` est une librairie non officielle.
- Elle utilise les endpoints publics Google Trends.
- Elle est gratuite mais moins garantie qu'une API payante comme SerpAPI.
- Si Google change son endpoint ou bloque temporairement la requete, la section reste vide.
- Le projet ne simule pas de regions pour masquer cet echec.

## Conclusion

La carte geographique utilise maintenant une alternative gratuite.

Les donnees restent reelles : elles proviennent de Google Trends via `interestByRegion()`.

SerpAPI n'est plus consomme pour `geoInterest`.
