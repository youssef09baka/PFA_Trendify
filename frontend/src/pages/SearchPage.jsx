import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock3, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import MediaBox from '../components/MediaBox';
import api from '../api/axios';
import { formatScore } from '../utils/ui';
import { getCardMediaUrl } from '../utils/media';

const RECENT_STORAGE_KEY = 'trendify_recent_searches';
const DEFAULT_SUGGESTIONS = ['GTA 6', 'OpenAI', 'Gaming', 'Startup IA', 'Google Trends'];

function displaySourceLabel(source) {
  const key = String(source || '').toLowerCase();
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google Trends';
  return source || 'Source inconnue';
}

function readRecentSearches() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function SearchResultCard({ trend }) {
  const id = trend._id || trend.id;
  const media = getCardMediaUrl(trend);
  const preview = trend.excerpt || trend.summary || trend.description || `Signal ${displaySourceLabel(trend.source)} dans la categorie ${trend.category || 'generale'}.`;

  return (
    <Link to={`/feed/${id}`} className="search-result-card">
      {media ? (
        <div className="search-result-media">
          <MediaBox src={media} alt={trend.title} aspect="square" />
        </div>
      ) : (
        <div className="search-result-placeholder">
          <TrendingUp size={22} />
        </div>
      )}

      <div className="search-result-copy">
        <div className="search-result-meta">
          <span>{displaySourceLabel(trend.source)}</span>
          <strong>{formatScore(trend.score)}</strong>
        </div>
        <h2>{trend.title || 'Tendance detectee'}</h2>
        <p>{preview}</p>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readRecentSearches);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/feed/search', { params: { q: value, limit: 50 } });
        setResults(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setError('Impossible de charger la recherche pour le moment.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const saveRecent = (value) => {
    const clean = value.trim();
    if (!clean) return;

    const next = [clean, ...recent.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecent(next);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    saveRecent(query);
  };

  const applySuggestion = (value) => {
    setQuery(value);
    saveRecent(value);
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_STORAGE_KEY);
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main className="product-main search-page-main">
        <form className="search-topbar" onSubmit={submitSearch}>
          <label className="search-input-shell" htmlFor="dedicated-search">
            <Search size={18} />
            <input
              id="dedicated-search"
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une tendance, une source ou une categorie"
              aria-label="Rechercher"
            />
            {query ? (
              <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            ) : null}
          </label>

          <button type="button" className="search-cancel-button" onClick={() => navigate('/home')}>
            Annuler
          </button>
        </form>

        {!query.trim() ? (
          <section className="search-discovery">
            <div className="search-section-heading">
              <div>
                <span className="eyebrow">Recherche</span>
                <h1>Trouvez rapidement un signal.</h1>
                <p>Recherchez une tendance, une source, une categorie ou une opportunite deja detectee.</p>
              </div>
            </div>

            <div className="search-shelf">
              <div className="search-shelf-header">
                <h2>Recherches recentes</h2>
                {recent.length ? <button type="button" onClick={clearRecent}>Effacer</button> : null}
              </div>

              <div className="search-chip-list">
                {(recent.length ? recent : DEFAULT_SUGGESTIONS).map((item) => (
                  <button key={item} type="button" onClick={() => applySuggestion(item)}>
                    <Clock3 size={15} />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="search-shelf">
              <div className="search-shelf-header">
                <h2>Suggestions populaires</h2>
              </div>
              <div className="search-chip-list popular">
                {DEFAULT_SUGGESTIONS.map((item) => (
                  <button key={item} type="button" onClick={() => applySuggestion(item)}>
                    <Sparkles size={15} />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="search-results-section">
            <div className="search-results-heading">
              <div>
                <span className="eyebrow">Resultats</span>
                <h1>{results.length} resultat{results.length > 1 ? 's' : ''} pour "{query.trim()}"</h1>
              </div>
              <button type="button" onClick={() => saveRecent(query)}>Enregistrer</button>
            </div>

            <div className="search-results-list">
              {loading ? (
                [1, 2, 3, 4].map((item) => <LoadingSkeleton key={item} height="106px" radius={22} />)
              ) : error ? (
                <EmptyState title="Recherche indisponible" subtitle={error} />
              ) : results.length ? (
                results.map((trend) => <SearchResultCard key={trend._id || trend.id || trend.title} trend={trend} />)
              ) : (
                <EmptyState
                  icon={<Search size={32} />}
                  title="Aucun resultat"
                  subtitle="Essayez un terme plus court, une source ou une categorie."
                />
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
