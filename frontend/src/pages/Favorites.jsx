import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Filter, Search, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import MediaBox from '../components/MediaBox';
import Input from '../components/Input';
import api from '../api/axios';
import { formatScore } from '../utils/ui';
import { getCardMediaUrl } from '../utils/media';

function displaySourceLabel(source) {
  const key = String(source || '').toLowerCase();
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google Trends';
  return source || 'Source inconnue';
}

function FavoriteCard({ trend, onRemove }) {
  const id = trend._id || trend.id;
  const media = getCardMediaUrl(trend);

  return (
    <article className="favorite-card">
      {media ? (
        <Link to={`/feed/${id}`} className="favorite-media">
          <MediaBox src={media} alt={trend.title} aspect="16:9" />
        </Link>
      ) : null}

      <div className="favorite-card-body">
        <div className="feed-pill-row">
          <span className="pill pill-source">{displaySourceLabel(trend.source)}</span>
          {trend.category ? <span className="pill pill-category">{trend.category}</span> : null}
        </div>

        <h2>{trend.title || 'Tendance sauvegardee'}</h2>
        <p>{trend.category ? `Signal ${displaySourceLabel(trend.source)} classe dans ${trend.category}.` : 'Ouvrez le detail pour lancer une analyse a la demande.'}</p>

        <div className="favorite-meta-row">
          <strong>Score {formatScore(trend.score)}</strong>
          <span>Analyse a la demande</span>
        </div>

        <div className="favorite-actions">
          <Link to={`/feed/${id}`} className="btn btn-primary">Ouvrir</Link>
          <Button variant="ghost" onClick={() => onRemove(id)} icon={<X size={14} />}>Retirer</Button>
        </div>
      </div>
    </article>
  );
}

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [toast, setToast] = useState('');

  async function loadFavorites(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/users/saved-trends');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setToast('Impossible de charger les favoris.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFavorites(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((trend) => {
      const source = String(trend.source || '').toLowerCase();
      const sourceMatch =
        sourceFilter === 'all' ||
        (sourceFilter === 'reddit' && source.includes('reddit')) ||
        (sourceFilter === 'google' && source.includes('google'));

      if (!query) return sourceMatch;

      return (
        sourceMatch &&
        [trend.title, trend.category, trend.source]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      );
    });
  }, [items, search, sourceFilter]);

  const removeFavorite = async (id) => {
    try {
      await api.delete(`/feed/${id}/save`);
      setItems((current) => current.filter((item) => (item._id || item.id) !== id));
      setToast('Favori retire.');
    } catch {
      setToast('Impossible de retirer ce favori.');
    }
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main className="product-main favorites-main">
        <section className="product-page-header">
          <div>
            <span className="eyebrow">Favoris</span>
            <h1>Vos tendances sauvegardees</h1>
            <p>Retrouvez les signaux importants et les opportunités à suivre.</p>
          </div>
          <Button variant="ghost" onClick={loadFavorites}>Actualiser</Button>
        </section>

        {toast ? <div className="inline-toast">{toast}</div> : null}

        <section className="favorites-toolbar">
          <div className="feed-search">
            <Search size={16} />
            <Input
              id="favorites-search"
              type="search"
              aria-label="Recherche dans les favoris"
              placeholder="Rechercher un favori, une categorie ou une analyse"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="feed-chip-row">
            {[
              ['all', 'Tous'],
              ['reddit', 'Reddit'],
              ['google', 'Google Trends']
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={sourceFilter === value ? 'primary' : 'ghost'}
                onClick={() => setSourceFilter(value)}
                icon={value === 'all' ? <Filter size={14} /> : null}
              >
                {label}
              </Button>
            ))}
          </div>
        </section>

        <section className="favorites-grid">
          {loading ? (
            [1, 2, 3].map((item) => <LoadingSkeleton key={item} height="280px" radius={24} />)
          ) : filteredItems.length ? (
            filteredItems.map((trend) => (
              <FavoriteCard key={trend._id || trend.id || trend.title} trend={trend} onRemove={removeFavorite} />
            ))
          ) : (
            <EmptyState
              icon={<Bookmark size={32} />}
              title="Aucun favori trouve"
              subtitle="Sauvegardez une tendance depuis Explorer pour la retrouver ici."
              action={<Link to="/feed" className="btn btn-primary">Explorer les tendances</Link>}
            />
          )}
        </section>
      </main>
    </div>
  );
}
