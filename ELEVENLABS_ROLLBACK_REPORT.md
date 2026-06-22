# ELEVENLABS_ROLLBACK_REPORT

Date: 2026-06-22

## Objectif

Abandonner completement ElevenLabs et revenir a la lecture vocale native du navigateur avec `speechSynthesis`, sans casser:

- Trendi texte
- le micro `SpeechRecognition`
- le bouton `Lire`
- le bouton `Arrêter`
- l'historique local du chat
- l'UI du widget

## Résumé exécutif

Rollback effectué.

ElevenLabs n'est plus utilise dans le runtime backend/frontend:

- route `/api/assistant/speech` supprimée
- controller speech supprimé
- service `backend/services/elevenLabsService.js` supprimé
- clé `ELEVENLABS_API_KEY` retirée du `.env` local
- aucun appel `/assistant/speech`
- aucun appel `api.elevenlabs.io`
- aucun `text-to-speech`
- aucun `new Audio()`
- aucun MP3/blob audio dans le code runtime

La lecture vocale utilise maintenant:

```js
window.speechSynthesis
SpeechSynthesisUtterance
```

## Fichiers modifiés

### backend/routes/assistantRoutes.js

Avant:

```js
const { chatWithAssistant, createAssistantSpeech } = require("../controllers/assistantController");

router.post("/chat", protect, chatWithAssistant);
router.post("/speech", protect, createAssistantSpeech);
```

Après:

```js
const { chatWithAssistant } = require("../controllers/assistantController");

router.post("/chat", protect, chatWithAssistant);
```

Preuve actuelle:

- ligne 5: seul `chatWithAssistant` est importé
- ligne 7: seule la route `POST /chat` existe
- aucune route `/speech`

### backend/controllers/assistantController.js

Avant:

- import `createSpeech`
- controller `createAssistantSpeech`
- headers MP3
- header `X-ElevenLabs-Request-Id`
- envoi `result.audio`

Après:

- seul `chatWithAssistant` reste exporté
- aucun controller audio backend
- aucun import ElevenLabs

Preuve actuelle:

- ligne 2: seul `askAssistant` est importé
- lignes 4-24: controller chat
- ligne 26: export `{ chatWithAssistant }`

### frontend/src/components/AssistantWidget.jsx

Modifications:

- suppression de l'appel `api.post('/assistant/speech')`
- suppression de la lecture MP3 via `new Audio()`
- suppression des refs `audioRef` / `audioUrlRef`
- suppression de `URL.createObjectURL`
- ajout de `SpeechSynthesisApi`
- ajout de `getBestFrenchVoice()`
- lecture via `SpeechSynthesisUtterance`
- bouton `Lire` / `Arrêter` conservé
- micro `SpeechRecognition` conservé

Preuves de code:

- `SpeechSynthesisApi`: ligne 10
- nettoyage Markdown conservé: lignes 16-30
- sélection meilleure voix française: lignes 32-60
- refresh des voix navigateur: lignes 103-125
- arrêt immédiat: lignes 138-142
- lecture navigateur: lignes 144-196
- bouton toggle `Lire` / `Arrêter`: lignes 365-374
- micro conservé: lignes 239-340

## Fichier supprimé

```text
backend/services/elevenLabsService.js
```

Ce fichier contenait:

- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_VOICE_NAME`
- `ELEVENLABS_MODEL_ID`
- `ELEVENLABS_TIMEOUT_MS`
- `getElevenLabsApiKey()`
- `createSpeech()`
- `axios.post("https://api.elevenlabs.io/v1/text-to-speech/...")`

Statut: supprimé.

## Variables d'environnement supprimées

Fichier:

```text
backend/.env
```

Action:

```text
Removed 1 ElevenLabs env line(s).
```

Vérification:

```bash
Select-String -Path backend\.env -Pattern 'ELEVENLABS_API_KEY|ELEVEN_LABS_API_KEY'
```

Résultat:

```text
aucun résultat
```

## Sélection automatique de voix française

Ordre implémenté dans `getBestFrenchVoice()`:

1. `Microsoft Henri`
2. `Microsoft Paul`
3. `Thomas`
4. `Rémy` / `Remy`
5. `French Male`
6. autre voix française masculine
7. meilleure voix française disponible
8. fallback navigateur si aucune voix française n'est détectée

Preuve:

```js
const priorities = [
  (item) => item.haystack.includes('microsoft henri'),
  (item) => item.haystack.includes('microsoft paul'),
  (item) => item.haystack.includes('thomas'),
  (item) => item.haystack.includes('rémy') || item.haystack.includes('remy'),
  (item) => item.haystack.includes('french male'),
  (item) => item.lang.toLowerCase().startsWith('fr') && /male|homme|masculin|henri|paul|thomas|rémy|remy/.test(item.haystack),
  (item) => item.lang.toLowerCase().startsWith('fr'),
  () => true
];
```

## Comportement lecture vocale

### Lire

Code:

```js
const utterance = new SpeechSynthesisUtterance(cleanText);
SpeechSynthesisApi.speak(utterance);
```

Effet:

- aucun backend
- aucun MP3
- aucune latence réseau
- démarrage immédiat côté navigateur

### Arrêter

Code:

```js
SpeechSynthesisApi?.cancel?.();
setPlayingKey('');
```

Effet:

- stop immédiat de la lecture
- bouton revient à `Lire`

### Reprise

Un second clic sur `Lire` recrée une nouvelle `SpeechSynthesisUtterance` et relance `speechSynthesis.speak()`.

## Micro conservé

Le code `SpeechRecognition` n'a pas été supprimé.

Preuves:

- `SpeechRecognitionApi`: ligne 7
- `recognition.lang = 'fr-FR'`: ligne 253
- `continuous = true`: ligne 254
- `interimResults = true`: ligne 255
- erreurs utilisateur conservées:
  - permission refusée
  - service vocal indisponible
  - microphone non détecté
  - aucune parole détectée
  - erreur réseau
  - interruption

## Preuve qu'aucun appel ElevenLabs n'existe encore dans le runtime

Commande:

```bash
rg -n "ElevenLabs|ELEVENLABS|ELEVEN_LABS|assistant/speech|createSpeech|elevenLabsService|text-to-speech|api\.elevenlabs|new Audio|audioRef|audioUrl|Audio\(|mp3|MP3|blob" backend frontend -g "!node_modules" -g "!dist"
```

Résultat:

```text
frontend\README.md:7:- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
frontend\README.md:8:- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)
```

Interprétation:

- aucune occurrence ElevenLabs dans `backend/`
- aucune occurrence ElevenLabs dans `frontend/src`
- aucune route `/assistant/speech`
- aucun appel `text-to-speech`
- aucun appel `api.elevenlabs.io`
- aucun code MP3/blob audio
- les seules lignes retournées concernent `Oxc/SWC` dans le README Vite, sans rapport avec ElevenLabs

## Preuve runtime backend

Serveur backend démarré sur port isolé:

```text
PORT=3024 node server.js
```

Requête testée:

```http
POST http://127.0.0.1:3024/api/assistant/speech
Content-Type: application/json

{"text":"test"}
```

Résultat:

```json
{
  "StatusCode": 404,
  "StatusDescription": "Not Found",
  "Body": ""
}
```

Conclusion:

La route backend speech n'existe plus. Elle ne peut donc plus appeler ElevenLabs.

## Validation npm test

Commande:

```bash
cd backend && npm test
```

Résultat:

```text
tests 7
pass 7
fail 0
duration_ms 2945.4416
```

## Validation npm run build

Commande:

```bash
cd frontend && npm run build
```

Résultat:

```text
✓ 1822 modules transformed.
✓ built in 1.45s
```

## Validation runtime UI automatisée

Tentative effectuée avec Chrome headless via CDP:

- backend isolé
- Vite isolé
- utilisateur de test créé
- instrumentation réseau
- instrumentation `speechSynthesis`

Résultat:

- le test UI complet n'a pas atteint l'état widget ouvert en headless
- erreur collectée: `assistant launcher not found`
- artifact: `artifacts/trendi-speechsynthesis-rollback-runtime.json`

Cause observée:

- l'automatisation Chrome headless n'a pas rendu le launcher Trendi dans l'état authentifié attendu
- ce blocage concerne le script de validation UI, pas le rollback code

Preuves malgré cela:

- la route backend `/api/assistant/speech` retourne 404
- le code frontend ne contient plus aucun appel `/assistant/speech`
- le code frontend ne contient plus aucun appel ElevenLabs
- le bouton `Lire` appelle directement `speechSynthesis.speak()`

## Fichiers supprimés

| Fichier | Statut |
|---|---|
| `backend/services/elevenLabsService.js` | supprimé |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `backend/routes/assistantRoutes.js` | suppression route `/speech` |
| `backend/controllers/assistantController.js` | suppression controller audio |
| `frontend/src/components/AssistantWidget.jsx` | rollback vers `speechSynthesis` |
| `backend/.env` | suppression variable ElevenLabs |

## Conclusion finale

ElevenLabs est retiré du runtime.

Le comportement actuel est:

- Trendi texte continue d'utiliser `/api/assistant/chat`
- le micro continue d'utiliser `SpeechRecognition`
- le bouton `Lire` utilise `speechSynthesis`
- le bouton `Arrêter` utilise `speechSynthesis.cancel()`
- aucun clic lecture ne peut déclencher `/api/assistant/speech`, car:
  - la route backend est supprimée
  - le frontend ne l'appelle plus
  - le service ElevenLabs est supprimé
  - la clé ElevenLabs est retirée du `.env`

Statut validation:

- `npm test`: OK
- `npm run build`: OK
- route speech backend: 404 confirmé
- grep runtime backend/frontend: aucune dépendance ElevenLabs restante
