import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Search, Zap, RefreshCw, ArrowRight } from 'lucide-react';
import { formatScore } from '../utils/ui';

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
  const [trends, setTrends] = useState([]);
  const [savedTrends, setSavedTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [recentSearches, setRecentSearches] = useState([]);
  const [aiLeft, setAiLeft] = useState(user?.aiRemaining ?? 5);
  const [analysisMessage, setAnalysisMessage] = useState('');

  async function fetchTrends() {
    setLoading(true);
    try {
      const { data } = await api.get('/feed');
      if (data && Array.isArray(data.items)) {
        setTrends(data.items);
      }
      if (data?.user?.aiRemaining !== undefined) {
        setAiLeft(data.user.aiRemaining);
      }
    } catch {
      setAnalysisMessage('Impossible de charger les tendances pour le moment.');
      setTimeout(() => setAnalysisMessage(''), 4200);
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  }

  async function fetchSaved() {
    try {
      const { data } = await api.get('/users/saved-trends');
      if (data && Array.isArray(data.items)) {
        setSavedTrends(data.items);
      }
    } catch {
      setAnalysisMessage('Impossible de charger les tendances sauvegardées.');
      setTimeout(() => setAnalysisMessage(''), 4200);
    }
  }

  useEffect(() => {
    fetchTrends();
    fetchSaved();
  }, []);

  useEffect(() => {
    if (user?.aiRemaining !== undefined) {
      setAiLeft(user.aiRemaining);
    }
  }, [user?.aiRemaining]);

  const preferencesCount = user?.preferences?.length || 0;
  const savedCount = savedTrends.length;

  const categories = trends.reduce((acc, trend) => {
    const key = trend.category || 'Non catégorisé';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => ({ category, count }));

  const sourceOptions = [
    { key: 'all', label: 'Toutes les sources' },
    { key: 'reddit', label: 'Reddit' },
    { key: 'google', label: 'Google' },
    { key: 'youtube', label: 'YouTube' },
  ];

  const filteredTrends = trends.filter((trend) => {
    const sourceMatch =
      filterSource === 'all' ||
      (trend.source || '').toLowerCase().includes(filterSource);

    const categoryMatchFilter =
      filterCategory === 'all' ||
      (trend.category || '').toLowerCase() === (filterCategory === 'all' ? '' : filterCategory.toLowerCase());

    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return sourceMatch && categoryMatchFilter;

    const titleMatch = (trend.title || '').toLowerCase().includes(searchValue);
    const categoryMatch = (trend.category || '').toLowerCase().includes(searchValue);
    const sourceMatchText = (trend.source || '').toLowerCase().includes(searchValue);
    return sourceMatch && categoryMatchFilter && (titleMatch || categoryMatch || sourceMatchText);
  });

  const recentDiscoveries = filteredTrends.slice(0, 4);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setRecentSearches((previous) => {
      const next = [query, ...previous.filter((item) => item !== query)];
      return next.slice(0, 4);
    });
  };

  const handleAnalyze = async () => {
    if (aiLeft <= 0) {
      setAnalysisMessage('Vous avez atteint la limite quotidienne d’analyses IA. Revenez demain.');
      return;
    }

    setAnalysisMessage('Analyse IA lancée. Mise à jour des tendances en cours...');

    try {
      const { data } = await api.get('/feed', { params: { refresh: true } });
      if (data && Array.isArray(data.items)) {
        setTrends(data.items);
      }
      if (data?.user?.aiRemaining !== undefined) {
        setAiLeft(data.user.aiRemaining);
      }
      setAnalysisMessage('Les dernières tendances ont été réévaluées et enregistrées.');
    } catch (error) {
      if (error.response?.status === 429) {
        setAnalysisMessage(error.response.data?.message || 'Quota IA atteint. Revenez demain.');
      } else {
        setAnalysisMessage('Impossible de renouveler les analyses IA pour le moment.');
      }
    } finally {
      setTimeout(() => {
        setAnalysisMessage('');
      }, 4200);
    }
  };

  const handleRecentSearch = (value) => {
    setSearch(value);
  };

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
                Retrouvez vos tendances sauvegardées, explorez les signaux récents et déclenchez l’analyse IA
                uniquement lorsque cela apporte de la valeur.
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
                  <strong>{aiLeft}/5</strong>
                </div>
                <div>
                  <span>Dernière synchronisation</span>
                  <strong>{lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
              </div>

              <form className="dashboard-search" onSubmit={handleSearchSubmit}>
                <label htmlFor="dashboard-search-input" style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                  Recherche dans votre espace
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      id="dashboard-search-input"
                      aria-label="Rechercher dans l'espace"
                      placeholder="Rechercher un thème, une source ou une catégorie"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      icon={<Search size={16} />}
                      helper="Appuyez sur Entrée pour enregistrer cette recherche."
                    />
                  </div>
                  <Button type="submit" variant="primary" style={{ padding: '12px 18px' }}>Rechercher</Button>
                </div>
              </form>
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

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Explorer</h2>
                  <p>Les signaux les plus visibles par catégorie.</p>
                </div>
              </div>

              <div className="workspace-panel-content">
                <div className="workspace-summary-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{filteredTrends.length}</span>
                  <span style={{ color: 'var(--text3)' }}>tendances correspondant à vos filtres</span>
                </div>

                <div className="workspace-chip-row">
                  {topCategories.map((category) => (
                    <Button key={category.category} type="button" variant="ghost" className="chip" onClick={() => setFilterCategory(category.category)} style={{ padding: '9px 14px' }}>{category.category} • {category.count}</Button>
                  ))}
                </div>

                <div className="recent-trends-grid">
                  {recentDiscoveries.length === 0 ? (
                    <div style={{ padding: 24, borderRadius: 18, background: 'var(--glass)', border: '1px solid var(--glass-b)', color: 'var(--text3)' }}>
                      Aucun signal n’apparaît avec les filtres actuels. Ajustez un filtre ou actualisez le flux pour retrouver des tendances visibles.
                    </div>
                  ) : (
                    recentDiscoveries.slice(0, 4).map((trend) => (
                      <div key={trend._id || trend.id || trend.title} className="recent-trend-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                          <strong style={{ fontSize: 13, color: 'var(--text)' }}>{trend.title}</strong>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{displaySourceLabel(trend.source)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--text3)', fontSize: 12 }}>
                          <span>{trend.category || 'Sans catégorie'}</span>
                          <span>Score {formatScore(trend.score)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Espace recherche</h2>
                  <p>Affinez rapidement vos signaux par source ou catégorie.</p>
                </div>
              </div>

              <div className="workspace-panel-content">
                <div className="workspace-chip-row">
                  {sourceOptions.map((source) => (
                    <Button key={source.key} type="button" variant={source.key === filterSource ? 'primary' : 'ghost'} className={source.key === filterSource ? 'chip active' : 'chip'} onClick={() => setFilterSource(source.key)} style={{ padding: '9px 14px' }}>{source.label}</Button>
                  ))}
                </div>

                {recentSearches.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10 }}>
                      Recherches récentes
                    </div>
                    <div className="recent-search">
                      {recentSearches.map((value) => (
                        <Button key={value} type="button" variant="ghost" onClick={() => handleRecentSearch(value)} style={{ padding: '8px 14px' }}>{value}</Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="workspace-summary-row" style={{ marginTop: 18 }}>
                  <span>Tendances affichées</span>
                  <strong>{filteredTrends.length}</strong>
                </div>
              </div>
            </div>

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Analyse IA</h2>
                  <p>Analyse IA limitée à 5 usages par jour.</p>
                </div>
              </div>

              <div className="workspace-panel-content ai-box">
                <div className="ai-status">
                  <div>
                    <span>Analyses restantes</span>
                    <strong>{aiLeft}/5</strong>
                  </div>
                  <div>
                    <span>Utilisation responsable</span>
                    <strong>Premium</strong>
                  </div>
                </div>

                <div className="ai-note">
                  L’IA est utilisée pour mettre à jour et enrichir les analyses de tendance lorsque cela apporte de la valeur.
                </div>

                <Button type="button" variant="primary" onClick={handleAnalyze} disabled={aiLeft <= 0} style={{ width: '100%' }}>Rafraîchir les analyses IA</Button>

                {analysisMessage && (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>{analysisMessage}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
