# TRENDI CRITICAL BUG FIX REPORT

## Bugs traites

### Bug 1 - Tendances football non trouvees

Cause racine :

- `football` etait traite comme un mot exact.
- Le moteur de recherche de Trendi ne reliait pas `football` a `sport`, `soccer`, `fifa`, `uefa`, `champions league`, `premier league`, `world cup`, etc.
- Si MongoDB contenait une tendance avec categorie `Sport` ou tag `UEFA`, mais sans le mot exact `football`, Trendi pouvait retourner `Aucune tendance pertinente trouvee`.

Fichier responsable :

- `backend/services/assistantService.js`

Correction appliquee :

- Ajout d'un mapping thematique etendu dans `TOPIC_ALIASES`.
- Extension des domaines detectes dans `extractTopicTerms()`.
- Ajout de stopwords conversationnels comme `dis`, `parle`, `montre`, `affiche`, pour eviter qu'ils polluent le sujet.
- Augmentation du nombre de termes de contexte de 10 a 24 pour conserver les alias importants.

Themes enrichis :

- football / sport / soccer / fifa / uefa
- gaming
- crypto
- business
- startup
- ia / ai
- tech
- sante

Validation :

- Ajout du test `assistant maps football requests to broader sport context`.
- Le test prouve que `dis-moi les tendances football` produit un contexte football/sport et classe une tendance `Sport + UEFA + soccer` devant une tendance hors sujet plus scoree.

### Bug 2 - Wake word fonctionne une seule fois

Cause racine :

- Le cycle `SpeechRecognition` du wake word dependait de redemarrages disperses.
- Apres activation du mode vocal, le listener etait stoppe, mais son redemarrage apres fermeture n'etait pas centralise.
- Certains callbacks `onend` pouvaient utiliser un etat React obsolete.

Fichier responsable :

- `frontend/src/components/AssistantWidget.jsx`

Correction appliquee :

- Ajout d'un cycle robuste :
  - `canRunWakeWordListener()`
  - `scheduleWakeWordRestart()`
  - `stopWakeWordListener({ reason })`
- Ajout de refs stables :
  - `wakeWordEnabledRef`
  - `isPublicPageRef`
  - `userRef`
  - `wakeStopReasonRef`
  - `wakeRestartTimerRef`
- Redemarrage automatique apres fermeture du mode vocal :
  - raison `voice_closed`
- Arret propre lors de l'activation :
  - raison `wake_detected`
- Protection contre les redemarrages pendant que le mode vocal est ouvert.

Logs ajoutes :

- `heard`
- `wake detected`
- `accepted`
- `rejected`
- `listener started`
- `listener stopped`
- `listener ended`
- `listener restart scheduled`
- `listener restarted`
- `listener start skipped`
- `listener start failed`

## Fichiers modifies

- `backend/services/assistantService.js`
- `backend/test/assistantRelevance.test.js`
- `frontend/src/components/AssistantWidget.jsx`

## Tests effectues

### Backend

Commande :

```bash
npm test
```

Resultat :

- 30 tests passes
- 0 echec

### Frontend lint

Commande :

```bash
npm run lint
```

Resultat :

- OK

### Frontend build

Commande :

```bash
npm run build
```

Resultat :

- OK
- Warning Vite existant sur la taille du bundle, non lie a Trendi.

## Commandes validees par tests

- `dis-moi les tendances football`
- `passe a la page favoris`
- `go favoris`
- `ouvre fav`
- `ouvre les favs`
- `passe en business`
- `montre moi les tendances IA`
- `mets l interface en noir`
- `trouve moi OpenAI`

## Conclusion

Trendi comprend maintenant les themes au lieu de se limiter aux mots exacts.

Le wake word dispose maintenant d'un cycle explicite et redemarre automatiquement apres fermeture du mode vocal, ce qui permet de reveiller Trendi plusieurs fois de suite sans rafraichir la page.
