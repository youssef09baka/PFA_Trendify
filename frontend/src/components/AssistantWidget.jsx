import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BarChart3, CheckCircle2, Mic, MicOff, Send, Sparkles, Square, Volume2, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatScore } from '../utils/ui';

const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
const STORAGE_KEY = 'trendi-conversation';
const VOICE_SEND_DELAY_MS = 1700;
const PENDING_ACTION_TTL_MS = 120000;
const SpeechSynthesisApi = window.speechSynthesis;
const THINKING_STEPS = [
  'Analyse des signaux',
  'Evaluation du potentiel',
  'Recherche des opportunites',
  'Verification des sources',
  'Construction de la reponse'
];

const isDev = import.meta.env.DEV;
const debugVoice = (...args) => {
  if (isDev) console.debug('[Trendi Voice]', ...args);
};
const debugInfo = (...args) => {
  if (isDev) console.info(...args);
};
const debugWarn = (...args) => {
  if (isDev) console.warn(...args);
};
const debugError = (...args) => {
  if (isDev) console.error(...args);
};

const sanitizeForSpeech = (value) => String(value || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/__([^_]+)__/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^\s{0,3}#{1,6}\s*/gm, '')
  .replace(/^\s{0,3}>\s?/gm, '')
  .replace(/^\s*[-*+]\s+/gm, '')
  .replace(/^\s*\d+[.)]\s+/gm, '')
  .replace(/[*#_~]/g, '')
  .replace(/-{3,}/g, '. ')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:!?])/g, '$1')
  .trim();

const getBestFrenchVoice = () => {
  if (!SpeechSynthesisApi) return null;

  const voices = SpeechSynthesisApi.getVoices();
  const normalized = voices.map((voice) => ({
    voice,
    name: String(voice.name || ''),
    lang: String(voice.lang || ''),
    haystack: `${voice.name || ''} ${voice.lang || ''}`.toLowerCase()
  }));

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

  for (const matcher of priorities) {
    const match = normalized.find(matcher);
    if (match) return match.voice;
  }

  return null;
};

const initialMessages = [
  {
    role: 'assistant',
    content: 'Bonjour, je suis Trendi. Posez-moi une question sur les tendances, les opportunités business ou les idées de contenu détectées par Trendify.'
  }
];

const getTrendId = (trend) => trend?._id || trend?.id;

const compactTrend = (trend) => ({
  id: getTrendId(trend),
  title: trend?.title || 'Tendance detectee',
  score: trend?.score || 0,
  source: trend?.source || 'Source inconnue',
  category: trend?.category || 'General',
  link: trend?.link || ''
});

export default function AssistantWidget() {
  const { user, updateUser } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored) && stored.length ? stored : initialMessages;
    } catch {
      return initialMessages;
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [playingKey, setPlayingKey] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [speechReady, setSpeechReady] = useState(() => Boolean(SpeechSynthesisApi));
  const [pendingAction, setPendingAction] = useState(null);
  const [shortMemory, setShortMemory] = useState({
    lastSubject: '',
    lastSearch: '',
    lastAction: null
  });
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const voiceModeOpenRef = useRef(false);
  const voiceProcessingRef = useRef(false);
  const loadingRef = useRef(false);
  const listeningRef = useRef(false);
  const playingKeyRef = useRef('');
  const finalTranscriptRef = useRef('');
  const voiceSendTimerRef = useRef(null);
  const pendingActionTimerRef = useRef(null);
  const speechRequestRef = useRef(0);
  const listRef = useRef(null);

  const speechSupported = Boolean(SpeechRecognitionApi);
  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);
  const voiceActivity = loading ? 'thinking' : playingKey ? 'speaking' : listening ? 'listening' : 'idle';
  const lastActionableTrend = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const actions = messages[index]?.actions;
      if (Array.isArray(actions) && actions.length) return actions[0];
    }
    return null;
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!actionFeedback) return undefined;
    const timer = window.setTimeout(() => setActionFeedback(''), 2800);
    return () => window.clearTimeout(timer);
  }, [actionFeedback]);

  useEffect(() => {
    voiceModeOpenRef.current = voiceModeOpen;
  }, [voiceModeOpen]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    playingKeyRef.current = playingKey;
  }, [playingKey]);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setThinkingIndex((index) => (index + 1) % THINKING_STEPS.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!SpeechSynthesisApi) return undefined;

    const refreshVoices = () => {
      const voice = getBestFrenchVoice();
      setSpeechReady(Boolean(voice || SpeechSynthesisApi.getVoices().length));
      if (voice) {
        debugInfo('[Trendi Voice] Voix sélectionnée', {
          name: voice.name,
          lang: voice.lang,
          localService: voice.localService,
          default: voice.default
        });
      }
    };

    refreshVoices();
    SpeechSynthesisApi.addEventListener?.('voiceschanged', refreshVoices);

    return () => {
      SpeechSynthesisApi.removeEventListener?.('voiceschanged', refreshVoices);
    };
  }, []);

  useEffect(() => () => {
    shouldListenRef.current = false;
    window.clearTimeout(voiceSendTimerRef.current);
    recognitionRef.current?.stop?.();
    speechRequestRef.current += 1;
    SpeechSynthesisApi?.cancel?.();
  }, []);

  const isPublicPage = ['/', '/login', '/signup'].includes(location.pathname);

  const stopSpeech = () => {
    speechRequestRef.current += 1;
    SpeechSynthesisApi?.cancel?.();
    setPlayingKey('');
  };

  const speak = (text, messageKey) => {
    if (!text) return false;
    if (playingKey === messageKey) {
      stopSpeech();
      restartVoiceLoop();
      return false;
    }

    const cleanText = sanitizeForSpeech(text);
    if (!cleanText) return false;
    if (!SpeechSynthesisApi || typeof SpeechSynthesisUtterance === 'undefined') {
      setVoiceError('La lecture vocale du navigateur est indisponible.');
      restartVoiceLoop();
      return false;
    }

    setVoiceError('');
    stopSpeech();
    const requestId = speechRequestRef.current;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const selectedVoice = getBestFrenchVoice();

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'fr-FR';
    } else {
      utterance.lang = 'fr-FR';
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      if (requestId === speechRequestRef.current) setPlayingKey(messageKey);
    };
    utterance.onend = () => {
      if (requestId === speechRequestRef.current) {
        setPlayingKey('');
        restartVoiceLoop();
      }
    };
    utterance.onerror = (event) => {
      if (requestId !== speechRequestRef.current) return;
      debugError('[Trendi Voice] SpeechSynthesis error', event);
      setVoiceError('La lecture vocale du navigateur a été interrompue.');
      setPlayingKey('');
      restartVoiceLoop();
    };

    debugInfo('[Trendi Voice] Lecture navigateur', {
      voice: utterance.voice?.name || 'voix navigateur par défaut',
      lang: utterance.lang,
      characters: cleanText.length
    });

    setPlayingKey(messageKey);
    SpeechSynthesisApi.speak(utterance);
    return true;
  };

  const stopVoice = ({ close = false } = {}) => {
    shouldListenRef.current = false;
    voiceProcessingRef.current = false;
    if (close) voiceModeOpenRef.current = false;
    window.clearTimeout(voiceSendTimerRef.current);
    window.clearTimeout(pendingActionTimerRef.current);
    recognitionRef.current?.stop?.();
    stopSpeech();
    setListening(false);
    setVoiceStatus('');
    if (close) {
      setVoiceModeOpen(false);
    }
  };

  const restartVoiceLoop = (delay = 450) => {
    if (!voiceModeOpenRef.current || !speechSupported) return;
    window.setTimeout(() => {
      if (!voiceModeOpenRef.current || listeningRef.current || loadingRef.current || playingKeyRef.current) return;
      startVoice({ continuousMode: true });
    }, delay);
  };

  const scheduleVoiceSend = (recognition) => {
    window.clearTimeout(voiceSendTimerRef.current);
    voiceSendTimerRef.current = window.setTimeout(() => {
      const finalText = finalTranscriptRef.current.trim();
      if (!finalText) return;

      debugVoice('send final transcript', finalText);
      voiceProcessingRef.current = true;
      recognition.stop();
      void sendMessage(finalText, { fromVoice: true });
    }, VOICE_SEND_DELAY_MS);
  };

  const showAction = (message, { appendMessage = true } = {}) => {
    setActionFeedback(message);
    if (appendMessage) {
      setMessages((prev) => [...prev, { role: 'assistant', content: message, actions: [] }]);
    }
  };

  const rememberPendingAction = (action) => {
    window.clearTimeout(pendingActionTimerRef.current);
    if (!action?.action || !action?.target) {
      setPendingAction(null);
      return;
    }

    const nextPendingAction = {
      ...action
    };
    debugInfo('[TRENDI] ACTION DETECTEE pending', nextPendingAction);
    setPendingAction(nextPendingAction);
    pendingActionTimerRef.current = window.setTimeout(() => {
      setPendingAction(null);
    }, PENDING_ACTION_TTL_MS);
  };

  const getActivePendingAction = () => {
    return pendingAction;
  };

  const applyPreferenceCommand = async (preferenceId) => {
    const nextPreferences = [preferenceId];
    await api.put('/users/preferences', { preferences: nextPreferences });
    updateUser({ preferences: nextPreferences });
    navigate('/feed');
  };

  const executeAssistantAction = async (action) => {
    if (!action || action.type !== 'action') return false;

    debugInfo('[TRENDI] ACTION DETECTEE frontend', action);
    try {
      if (action.action === 'navigate' && action.target) {
        navigate(action.target);
        showAction(action.message || 'Navigation effectuee.', { appendMessage: false });
        setShortMemory((memory) => ({ ...memory, lastAction: action }));
        debugInfo('[TRENDI] ACTION EXECUTEE', action);
        return true;
      }

      if (action.action === 'theme') {
        if (action.target === 'dark' && !dark) toggleTheme();
        if (action.target === 'light' && dark) toggleTheme();
        showAction(action.message || 'Theme mis a jour.', { appendMessage: false });
        setShortMemory((memory) => ({ ...memory, lastAction: action }));
        debugInfo('[TRENDI] ACTION EXECUTEE', action);
        return true;
      }

      if (action.action === 'filter' && action.target) {
        await applyPreferenceCommand(action.target);
        showAction(action.message || `Filtre ${action.target} applique.`, { appendMessage: false });
        setShortMemory((memory) => ({ ...memory, lastAction: action, lastSubject: action.target }));
        debugInfo('[TRENDI] ACTION EXECUTEE', action);
        return true;
      }

      if (action.action === 'search' && action.target) {
        navigate(`/search?q=${encodeURIComponent(action.target)}`);
        showAction(action.message || `Recherche ${action.target} lancee.`, { appendMessage: false });
        setShortMemory((memory) => ({ ...memory, lastAction: action, lastSearch: action.target, lastSubject: action.target }));
        debugInfo('[TRENDI] ACTION EXECUTEE', action);
        return true;
      }

      if (action.action === 'open_trend') {
        const trendId = action.target && action.target !== 'current' ? action.target : lastActionableTrend?.id;
        if (!trendId) {
          showAction("Choisis d'abord une tendance, puis je l'ouvrirai.");
          debugWarn('[TRENDI] ACTION ECHOUEE', { action, cause: 'missing_trend_id' });
          return true;
        }
        navigate(`/feed/${trendId}`);
        showAction(action.message || "J'ouvre cette tendance.", { appendMessage: false });
        setShortMemory((memory) => ({ ...memory, lastAction: action }));
        debugInfo('[TRENDI] ACTION EXECUTEE', action);
        return true;
      }

      if (action.action === 'analyze') {
        const trendId = action.target && action.target !== 'current' ? action.target : lastActionableTrend?.id;
        if (!trendId) {
          showAction("Choisis d'abord une tendance, puis je lancerai l'analyse.");
          debugWarn('[TRENDI] ACTION ECHOUEE', { action, cause: 'missing_trend_id' });
          return true;
        }
        navigate(`/ai/${trendId}`);
        showAction(action.message || "Je lance l'analyse.", { appendMessage: false });
        setShortMemory((memory) => ({ ...memory, lastAction: action }));
        debugInfo('[TRENDI] ACTION EXECUTEE', action);
        return true;
      }

      debugWarn('[TRENDI] ACTION ECHOUEE', { action, cause: 'unsupported_action' });
      return false;
    } catch (error) {
      debugError('[TRENDI] ACTION ECHOUEE', { action, cause: error?.message || error });
      return false;
    }
  };

  const sendMessage = async (value = input, options = {}) => {
    const message = value.trim();
    if (!message || loading) return;

    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const activePendingAction = getActivePendingAction();
      const { data } = await api.post('/assistant/chat', {
        message,
        source: options.fromVoice ? 'voice' : 'text',
        context: {
          lastTrend: lastActionableTrend || null,
          shortMemory,
          pendingAction: activePendingAction,
          recentMessages: messages.slice(-6).map((item) => ({
            role: item.role,
            content: item.content
          }))
        }
      });
      const answer = data?.data?.answer || 'Je n’ai pas pu produire une réponse exploitable.';
      const assistantAction = data?.data?.action || null;
      const nextPendingAction = data?.data?.pendingAction || null;
      const actions = Array.isArray(data?.data?.trends)
        ? data.data.trends.map(compactTrend).filter((trend) => trend.id).slice(0, 3)
        : [];
      if (actions.length) {
        setShortMemory((memory) => ({
          ...memory,
          lastSubject: actions[0].title,
          lastSearch: memory.lastSearch || actions[0].title
        }));
      }
      debugInfo('[TRENDI] BACKEND RESPONSE', {
        status: data?.data?.status,
        intent: data?.data?.intent,
        confidence: data?.data?.confidence,
        action: assistantAction,
        pendingAction: nextPendingAction
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: answer, actions: assistantAction ? [] : actions }]);
      if (nextPendingAction) {
        rememberPendingAction(nextPendingAction);
      } else if (assistantAction || activePendingAction) {
        setPendingAction(null);
      }
      if (assistantAction) {
        const executed = await executeAssistantAction(assistantAction);
        if (!executed) {
          showAction("Je n'ai pas pu executer cette action.");
        }
        if (options.fromVoice || voiceModeOpen) {
          window.setTimeout(() => {
            const started = speak(answer, `voice-${Date.now()}`);
            if (!started) restartVoiceLoop();
          }, 80);
        } else {
          restartVoiceLoop();
        }
      } else if (options.fromVoice || voiceModeOpen) {
        window.setTimeout(() => {
          const started = speak(answer, `voice-${Date.now()}`);
          if (!started) restartVoiceLoop();
        }, 80);
      }
    } catch (error) {
      const answer = error.response?.data?.status === 'ai_unavailable'
        ? 'Trendi indisponible\n\nLe moteur IA est actuellement inaccessible. Veuillez réessayer dans quelques instants.'
        : (error.response?.data?.message || 'Trendi est momentanément indisponible.');
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      restartVoiceLoop();
    } finally {
      voiceProcessingRef.current = false;
      setLoading(false);
    }
  };

  const startVoice = ({ openVoiceMode = false, continuousMode = false } = {}) => {
    setVoiceError('');
    if (openVoiceMode) {
      voiceModeOpenRef.current = true;
      setVoiceModeOpen(true);
    }
    if (!speechSupported) {
      setVoiceError('Votre navigateur ne supporte pas la reconnaissance vocale.');
      debugVoice('speech recognition unsupported');
      return;
    }
    if (loading) return;
    if (listening) {
      if (continuousMode) return;
      debugVoice('manual stop');
      stopVoice();
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    finalTranscriptRef.current = '';
    setVoiceStatus('Écoute en cours...');

    recognition.onstart = () => {
      debugVoice('onstart');
      setListening(true);
      setVoiceStatus('Parlez maintenant. Trendi écoute...');
    };
    recognition.onerror = (event) => {
      debugVoice('onerror', event.error);
      debugError('[Trendi Voice] SpeechRecognition error', {
        error: event.error,
        message: event.message || '',
        type: event.type,
        timeStamp: event.timeStamp
      });
      if (event.error === 'aborted' && voiceProcessingRef.current && voiceModeOpenRef.current) {
        setVoiceStatus('');
        return;
      }
      const errorMessages = {
        'not-allowed': 'Permission microphone refusée.',
        'service-not-allowed': 'Service vocal du navigateur indisponible ou bloqué.',
        'audio-capture': 'Microphone non détecté.',
        'no-speech': 'Aucune parole détectée. Réessayez en parlant après le clic.',
        network: 'Service vocal du navigateur indisponible.',
        aborted: 'Reconnaissance vocale interrompue.'
      };

      const message = errorMessages[event.error] || 'La reconnaissance vocale a été interrompue.';
      setVoiceError(`${message} Erreur SpeechRecognition : ${event.error || 'inconnue'}`);

      if (event.error !== 'no-speech') {
        stopVoice();
      } else {
        setVoiceStatus('');
      }
    };
    recognition.onend = () => {
      debugVoice('onend', { shouldListen: shouldListenRef.current, finalTranscript: finalTranscriptRef.current });
      if (shouldListenRef.current && !finalTranscriptRef.current.trim()) {
        try {
          recognition.start();
          debugVoice('restart after early end');
          return;
        } catch (error) {
          debugVoice('restart failed', error);
          shouldListenRef.current = false;
          setVoiceError('La reconnaissance vocale s’est arrêtée. Cliquez à nouveau sur le micro.');
        }
      }
      setListening(false);
      setVoiceStatus('');
    };
    recognition.onresult = (event) => {
      debugVoice('onresult', { resultIndex: event.resultIndex, resultsLength: event.results.length });
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = String(event.results[index]?.[0]?.transcript || '').trim();
        if (!transcript) continue;

        if (event.results[index].isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const visibleTranscript = `${finalTranscriptRef.current} ${interimTranscript}`.trim();
      if (visibleTranscript) setInput(visibleTranscript);

      if (finalTranscriptRef.current) {
        setVoiceStatus('Phrase détectée. Envoi dans un instant...');
        scheduleVoiceSend(recognition);
      }
    };

    try {
      recognition.start();
      debugVoice('start called', { continuous: recognition.continuous, interimResults: recognition.interimResults });
    } catch (error) {
      debugVoice('start failed', error);
      setVoiceError('Impossible de démarrer le microphone.');
      stopVoice();
    }
  };

  if (!user || isPublicPage) return null;

  return (
    <div className="assistant-widget">
      {voiceModeOpen ? (
        <section className={`assistant-voice-stage assistant-voice-stage--${voiceActivity}`} aria-label="Mode vocal Trendi">
          <div className="assistant-voice-backdrop" />
          <div className="assistant-voice-shell">
            <button type="button" className="assistant-voice-close" onClick={() => stopVoice({ close: true })} aria-label="Fermer le mode vocal">
              <X size={18} />
            </button>
            <div className="assistant-voice-topline">
              <span>Mode vocal</span>
              <strong>Trendi</strong>
            </div>
            <div className="assistant-orb" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="assistant-voice-copy">
              <h2>
                {voiceActivity === 'speaking'
                  ? 'Trendi vous repond'
                  : voiceActivity === 'thinking'
                    ? THINKING_STEPS[thinkingIndex]
                    : voiceActivity === 'listening'
                      ? 'Je vous ecoute'
                      : 'Pret a analyser une tendance'}
              </h2>
              <p>{voiceError || voiceStatus || 'Posez une question sur une opportunite, une tendance ou un marche.'}</p>
            </div>
            <div className="assistant-voice-controls">
              <button
                type="button"
                className={listening ? 'assistant-voice-control is-active' : 'assistant-voice-control'}
                onClick={() => startVoice()}
                disabled={loading}
                aria-label={listening ? 'Arreter le micro' : 'Activer le micro'}
              >
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {open ? (
        <section className="assistant-panel" aria-label="Assistant Trendi">
          <header className="assistant-header">
            <div>
              <span>Assistant tendances</span>
              <strong>Trendi</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer Trendi">
              <X size={16} />
            </button>
          </header>

          {actionFeedback ? (
            <div className="assistant-action-feedback" role="status">
              <CheckCircle2 size={15} />
              <span>{actionFeedback}</span>
            </div>
          ) : null}

          <div ref={listRef} className="assistant-messages">
            {messages.map((message, index) => {
              const messageKey = `${message.role}-${index}`;
              const isPlaying = playingKey === messageKey;
              return (
                <div key={messageKey} className={`assistant-message assistant-message--${message.role}`}>
                  <p>{message.content}</p>
                  {message.role === 'assistant' && Array.isArray(message.actions) && message.actions.length ? (
                    <div className="assistant-trend-actions">
                      {message.actions.map((trend) => (
                        <article key={trend.id} className="assistant-trend-card">
                          <div>
                            <span>{trend.source} · {trend.category}</span>
                            <strong>{trend.title}</strong>
                          </div>
                          <b>{formatScore(trend.score)}</b>
                          <div className="assistant-trend-links">
                            <a href={`/feed/${trend.id}`}>Voir la tendance</a>
                            <a href={`/ai/${trend.id}`}>Voir le rapport</a>
                            {trend.link ? (
                              <a href={trend.link} target="_blank" rel="noreferrer">
                                Source <ArrowUpRight size={12} />
                              </a>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {message.role === 'assistant' ? (
                    <button
                      type="button"
                      className="assistant-audio-toggle"
                      onClick={() => { speak(message.content, messageKey); }}
                      aria-label={isPlaying ? 'Arrêter la lecture' : 'Lire la réponse'}
                      title={isPlaying ? 'Arrêter' : 'Lire'}
                    >
                      {isPlaying ? <Square size={12} /> : <Volume2 size={13} />}
                      <span>{isPlaying ? 'Arrêter' : 'Lire'}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
            {loading ? (
              <div className="assistant-thinking-card">
                <div className="assistant-thinking-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span>{THINKING_STEPS[thinkingIndex]}</span>
                  <p>Trendi construit une reponse utile et actionnable.</p>
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <button
              type="button"
              className={listening ? 'assistant-voice is-listening' : 'assistant-voice'}
              onClick={() => startVoice({ openVoiceMode: true })}
              disabled={loading}
              aria-label="Dicter une question"
              title={speechSupported ? 'Dicter une question' : 'Reconnaissance vocale indisponible'}
            >
              <Mic size={16} />
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Demandez : quelles tendances ont le plus fort potentiel ?"
              rows={1}
            />
            <button type="submit" className="assistant-send" disabled={!canSend} aria-label="Envoyer">
              <Send size={16} />
            </button>
          </form>
          {(voiceStatus || voiceError || !speechSupported || !speechReady) ? (
            <div className={voiceError || !speechSupported ? 'assistant-voice-note assistant-voice-note--error' : 'assistant-voice-note'}>
              {voiceError || (!speechSupported ? 'Votre navigateur ne supporte pas la reconnaissance vocale.' : !speechReady ? 'Lecture vocale du navigateur indisponible.' : voiceStatus)}
            </div>
          ) : null}
        </section>
      ) : (
        <button type="button" className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Ouvrir Trendi">
          <BarChart3 size={18} />
          Trendi
        </button>
      )}
    </div>
  );
}
