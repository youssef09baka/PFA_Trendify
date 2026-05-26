import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Search, Zap, RefreshCw, ArrowRight } from 'lucide-react';

function formatNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function displaySourceLabel(source) {
  const key = (source || '').toLowerCase();
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google';
  if (key.includes('youtube')) return 'YouTube';
  return source || 'Source inconnue';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [trends, setTrends] = useState([]);
  const [savedTrends, setSavedTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [recentSearches, setRecentSearches] = useState([]);
  const [aiLeft, setAiLeft] = useState(5);
  const [analysisMessage, setAnalysisMessage] = useState('');

  async function fetchTrends() {
    setLoading(true);
    try {
      const { data } = await api.get('/feed');
      if (data && Array.isArray(data.items)) {
        setTrends(data.items);
      }
    } catch (error) {
      console.error('Unable to load feed trends', error);
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
    } catch (error) {
      console.error('Unable to load saved trends', error);
    }
  }

  useEffect(() => {
    fetchTrends();
    fetchSaved();
  }, []);

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

    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return sourceMatch;

    const titleMatch = (trend.title || '').toLowerCase().includes(searchValue);
    const categoryMatch = (trend.category || '').toLowerCase().includes(searchValue);
    const sourceMatchText = (trend.source || '').toLowerCase().includes(searchValue);
    return sourceMatch && (titleMatch || categoryMatch || sourceMatchText);
  });

  const recentDiscoveries = trends.slice(0, 4);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setRecentSearches((previous) => {
      const next = [query, ...previous.filter((item) => item !== query)];
      return next.slice(0, 4);
    });
  };

  const handleAnalyze = () => {
    if (aiLeft <= 0) {
      setAnalysisMessage('Vous avez atteint la limite quotidienne d’analyses IA. Revenez demain.');
      return;
    }

    setAiLeft((previous) => previous - 1);
    setAnalysisMessage('Analyse IA lancée. Choisissez une tendance pour voir les résultats.');
    setTimeout(() => {
      setAnalysisMessage('');
    }, 4200);
  };

  const handleRecentSearch = (value) => {
    setSearch(value);
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main style={{ paddingTop: 58, minHeight: '100vh', background: 'var(--bg)' }}>
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
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input
                      id="dashboard-search-input"
                      className="input-field search-input"
                      type="text"
                      placeholder="Rechercher un thème, une source ou une catégorie"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      style={{ paddingLeft: 42 }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: '12px 18px' }}>
                    Rechercher
                  </button>
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
                <button type="button" className="btn-outline" onClick={fetchSaved} style={{ fontSize: 12, padding: '8px 14px' }}>
                  Actualiser
                </button>
              </div>

              <div className="workspace-panel-content">
                {loading ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="workspace-item" style={{ minHeight: 78 }} />
                    ))}
                  </div>
                ) : savedTrends.length === 0 ? (
                  <div className="workspace-empty">Aucune tendance sauvegardée pour le moment.</div>
                ) : (
                  savedTrends.slice(0, 3).map((trend) => (
                    <a
                      key={trend._id || trend.id || trend.title}
                      href={`/feed/${trend._id || trend.id}`}
                      className="workspace-item"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="workspace-item-title">{trend.title || 'Signal sauvegardé'}</div>
                      <div className="workspace-item-meta">
                        <span>{displaySourceLabel(trend.source)}</span>
                        <span>{trend.category || 'Sans catégorie'}</span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Explorer</h2>
                  <p>Dernières découvertes et catégories en hausse.</p>
                </div>
              </div>

              <div className="workspace-panel-content">
                <div className="workspace-summary-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{filteredTrends.length}</span>
                  <span style={{ color: 'var(--text3)' }}>tendances correspondant à vos filtres</span>
                </div>

                <div className="workspace-chip-row">
                  {topCategories.map((category) => (
                    <button key={category.category} type="button" className="chip">
                      {category.category} • {category.count}
                    </button>
                  ))}
                </div>

                <div className="recent-trends-grid">
                  {recentDiscoveries.slice(0, 4).map((trend) => (
                    <div key={trend._id || trend.id || trend.title} className="recent-trend-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                        <strong style={{ fontSize: 13, color: 'var(--text)' }}>{trend.title}</strong>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{displaySourceLabel(trend.source)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--text3)', fontSize: 12 }}>
                        <span>{trend.category || 'Sans catégorie'}</span>
                        <span>Score {trend.score ?? '–'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Espace recherche</h2>
                  <p>Affinez votre recherche par mot-clé, source ou catégorie.</p>
                </div>
              </div>

              <div className="workspace-panel-content">
                <div className="workspace-chip-row">
                  {sourceOptions.map((source) => (
                    <button
                      key={source.key}
                      type="button"
                      className={source.key === filterSource ? 'chip active' : 'chip'}
                      onClick={() => setFilterSource(source.key)}
                    >
                      {source.label}
                    </button>
                  ))}
                </div>

                {recentSearches.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10 }}>
                      Recherches récentes
                    </div>
                    <div className="recent-search">
                      {recentSearches.map((value) => (
                        <button key={value} type="button" onClick={() => handleRecentSearch(value)}>
                          {value}
                        </button>
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
                  <p>Analyse manuelle, limitée à 5 usages par jour.</p>
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
                  L’IA est déclenchée uniquement lorsque vous avez besoin d’un insight, d’une idée
                  ou d’une opportunité concrète.
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={aiLeft <= 0}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Analyser avec IA
                </button>

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