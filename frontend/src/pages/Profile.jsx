import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Cpu,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Mic,
  Moon,
  Music,
  Rocket,
  Sun,
  UserRound
} from 'lucide-react';

const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
const WAKE_WORD_STORAGE_PREFIX = 'trendify_trendi_wake_word';
const getWakeWordStorageKey = (user) => `${WAKE_WORD_STORAGE_PREFIX}:${user?.id || user?._id || user?.email || 'anonymous'}`;

const CATEGORIES = [
  { id: 'tech', label: 'Technologie', sub: 'IA, Dev, Data', icon: <Cpu size={22} />, color: '#2563EB' },
  { id: 'gaming', label: 'Gaming', sub: 'VR, Esport, Mobile', icon: <Gamepad2 size={22} />, color: '#0891B2' },
  { id: 'business', label: 'Business', sub: 'Startup, Finance', icon: <Briefcase size={22} />, color: '#16A34A' },
  { id: 'education', label: 'Education', sub: 'Cours, Bootcamp', icon: <GraduationCap size={22} />, color: '#0EA5E9' },
  { id: 'health', label: 'Sante', sub: 'Fitness, Bien-etre', icon: <HeartPulse size={22} />, color: '#DC2626' },
  { id: 'society', label: 'Societe', sub: 'Actualite, Culture', icon: <Globe size={22} />, color: '#0284C7' },
  { id: 'startup', label: 'Startup', sub: 'Levees, Produits', icon: <Rocket size={22} />, color: '#059669' },
  { id: 'creator', label: 'Createurs', sub: 'YouTube, TikTok', icon: <Music size={22} />, color: '#2563EB' }
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [selected, setSelected] = useState(() => Array.isArray(user?.preferences) ? user.preferences : []);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => localStorage.getItem(getWakeWordStorageKey(user)) === 'true');
  const [wakeWordMessage, setWakeWordMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const togglePreference = (id) => {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const savePreferences = async () => {
    if (!selected.length) {
      setMessage('Choisissez au moins une categorie avant de sauvegarder.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.put('/users/preferences', { preferences: selected });
      const savedPreferences = data.preferences || selected;
      setSelected(savedPreferences);
      updateUser({ preferences: savedPreferences });
      setMessage('Profil mis a jour.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const activeLabels = CATEGORIES.filter((category) => selected.includes(category.id)).map((category) => category.label);
  const aiRemaining = Number(user?.aiRemaining ?? 0);
  const speechRecognitionSupported = Boolean(SpeechRecognitionApi);

  const toggleWakeWord = async () => {
    const nextValue = !wakeWordEnabled;

    if (nextValue && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setWakeWordMessage('Microphone autorise. Dites "Ok Trendi" pour tester.');
      } catch {
        setWakeWordMessage('Autorisez le microphone pour utiliser l’activation vocale.');
        return;
      }
    }

    setWakeWordEnabled(nextValue);
    localStorage.setItem(getWakeWordStorageKey(user), String(nextValue));
    window.dispatchEvent(new Event('trendi-wake-word-change'));
    if (!nextValue) setWakeWordMessage('Activation vocale desactivee.');
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main className="product-main profile-main">
        <section className="product-page-header profile-header">
          <div>
            <span className="eyebrow">Profil</span>
            <h1>Votre espace personnel</h1>
            <p>Gerez vos preferences, votre theme et vos informations de veille.</p>
          </div>
          <Link to="/feed" className="btn btn-primary">
            Explorer <ArrowRight size={16} />
          </Link>
        </section>

        {message ? <div className="inline-toast">{message}</div> : null}

        <div className="profile-grid">
          <aside className="profile-card profile-summary-card">
            <div className="profile-avatar-large">
              <UserRound size={28} />
            </div>
            <h2>{user?.name || 'Utilisateur'}</h2>
            <p>{user?.email || 'Compte Trendify'}</p>

            <div className="profile-stats-list">
              <div>
                <span>Analyses restantes</span>
                <strong>{aiRemaining}</strong>
              </div>
              <div>
                <span>Preferences</span>
                <strong>{selected.length}</strong>
              </div>
              <div>
                <span>Theme</span>
                <strong>{dark ? 'Sombre' : 'Clair'}</strong>
              </div>
            </div>
          </aside>

          <section className="profile-card">
            <div className="profile-section-header">
              <div>
                <span className="eyebrow">Preferences</span>
                <h2>Domaines suivis</h2>
                <p>Explorer affichera uniquement les tendances correspondant a ces choix.</p>
              </div>
              <Button onClick={() => setSelected(CATEGORIES.map((category) => category.id))} variant="ghost">Tout selectionner</Button>
            </div>

            <div className="preference-chip-list">
              {activeLabels.length ? activeLabels.map((label) => <span key={label}>{label}</span>) : <span>Aucune preference active</span>}
            </div>

            <div className="profile-preference-grid">
              {CATEGORIES.map((category) => {
                const active = selected.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={active ? 'profile-preference active' : 'profile-preference'}
                    onClick={() => togglePreference(category.id)}
                    style={{ '--preference-color': category.color }}
                  >
                    <span className="profile-preference-icon">{category.icon}</span>
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.sub}</small>
                    </span>
                    {active ? <CheckCircle2 size={16} /> : null}
                  </button>
                );
              })}
            </div>

            <div className="profile-actions">
              <Button onClick={savePreferences} disabled={loading || selected.length === 0} loading={loading}>
                Enregistrer les preferences
              </Button>
              <Button variant="ghost" onClick={() => navigate('/home')}>Retour accueil</Button>
            </div>
          </section>

          <section className="profile-card profile-settings-card">
            <div className="profile-section-header">
              <div>
                <span className="eyebrow">Apparence</span>
                <h2>Theme de l'interface</h2>
                <p>Le reglage reste ici, comme dans une vraie zone profil.</p>
              </div>
            </div>

            <button type="button" className="theme-toggle-card profile-theme-toggle" onClick={toggleTheme} aria-label="Changer le theme">
              {dark ? <Moon size={18} /> : <Sun size={18} />}
              <span>{dark ? 'Mode sombre actif' : 'Mode clair actif'}</span>
            </button>
          </section>

          {speechRecognitionSupported ? (
            <section className="profile-card profile-settings-card profile-voice-card">
              <div className="profile-section-header">
                <div>
                  <span className="eyebrow">Assistant vocal Trendi</span>
                  <h2>Activation vocale</h2>
                  <p>Autoriser Trendi a s'activer automatiquement lorsque vous dites "Ok Trendi".</p>
                </div>
              </div>

              <button
                type="button"
                className={wakeWordEnabled ? 'profile-wake-toggle is-active' : 'profile-wake-toggle'}
                onClick={toggleWakeWord}
                aria-pressed={wakeWordEnabled}
              >
                <span className="profile-wake-icon"><Mic size={18} /></span>
                <span>
                  <strong>{wakeWordEnabled ? 'Activation vocale activee' : 'Activation vocale desactivee'}</strong>
                  <small>{wakeWordEnabled ? 'Ok Trendi peut ouvrir le mode vocal.' : 'Trendi demarre uniquement au clic.'}</small>
                </span>
                <b>{wakeWordEnabled ? 'ON' : 'OFF'}</b>
              </button>

              <div className={wakeWordEnabled ? 'profile-wake-status is-active' : 'profile-wake-status'}>
                {wakeWordEnabled ? '🟢 Activation vocale activée' : '⚪ Activation vocale désactivée'}
              </div>
              {wakeWordMessage ? <p className="profile-wake-help">{wakeWordMessage}</p> : null}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
