import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { RefreshCw } from 'lucide-react';

function displaySourceLabel(source) {
  const key = (source || '').toLowerCase();
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google';
  if (key.includes('youtube')) return 'YouTube';
  return source || 'Source inconnue';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedTrends, setSavedTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [aiLeft, setAiLeft] = useState(Number(user?.aiRemaining) || 0);

  async function fetchTrends() {
    try {
      const { data } = await api.get('/feed');
      if (data?.user?.aiRemaining !== undefined) {
        setAiLeft(Number(data.user.aiRemaining) || 0);
      }
    } catch {
      // Silent fail
    }
  }

  async function fetchSaved() {
    try {
      const { data } = await api.get('/users/saved-trends');
      if (data && Array.isArray(data.items)) {
        setSavedTrends(data.items);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrends();
      void fetchSaved();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const preferencesCount = user?.preferences?.length || 0;
  const savedCount = savedTrends.length;

  return (
    <div className="page-layout">
      <Navbar />
      <main className="dashboard-main" style={{ paddingTop: 58, minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

          <section className="dashboard-hero">
            <div className="dashboard-hero-copy">
              <span className="eyebrow">Votre espace de veille intelligent</span>
              <h1>Veille, découvertes et actions</h1>
              <p>
                Retrouvez vos tendances sauvegardées et explorez les derniers signaux en veille.
              </p>
            </div>

            <div className="dashboard-hero-card">
              <div className="dashboard-summary">
                <div>
                  <span>Préférences actives</span>
                  <strong>{preferencesCount}</strong>
                </div>
                <div>
                  <span>Tendances sauvegardées</span>
                  <strong>{savedCount}</strong>
                </div>
                <div>
                  <span>Analyses IA restantes</span>
                  <strong>{aiLeft}</strong>
                </div>
                <div>
                  <span>Dernière synchronisation</span>
                  <strong>{lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
              </div>
            </div>
          </section>

          <div className="workspace-grid">
            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Sauvegardés</h2>
                  <p>Accès rapide aux signaux que vous suivez.</p>
                </div>
                <Button type="button" variant="ghost" onClick={fetchSaved} style={{ fontSize: 12, padding: '8px 14px' }}>Actualiser</Button>
              </div>

              <div className="workspace-panel-content">
                {loading ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="workspace-item" style={{ minHeight: 78, padding: 18, display: 'grid', gap: 10, background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 16 }}>
                        <LoadingSkeleton height="14px" radius={8} />
                        <LoadingSkeleton height="12px" width="60%" radius={8} />
                      </div>
                    ))}
                  </div>
                ) : savedTrends.length === 0 ? (
                  <EmptyState
                    title="Aucune tendance sauvegardée"
                    subtitle="Sauvegardez un signal depuis le flux pour le retrouver ici et suivre son évolution."
                    action={
                      <Button type="button" variant="primary" onClick={() => navigate('/feed')}>
                        Explorer le flux
                      </Button>
                    }
                  />
                ) : (
                  savedTrends.slice(0, 3).map((trend) => (
                    <Link
                      key={trend._id || trend.id || trend.title}
                      to={`/feed/${trend._id || trend.id}`}
                      className="workspace-item"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="workspace-item-title">{trend.title || 'Signal sauvegardé'}</div>
                      <div className="workspace-item-meta">
                        <span>{displaySourceLabel(trend.source)}</span>
                        <span>{trend.category || 'Sans catégorie'}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
