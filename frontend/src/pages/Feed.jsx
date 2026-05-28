import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import {
  Bookmark,
  RefreshCw,
  Search,
  Loader2,
  Filter,
  ArrowRight,
  X,
  Zap
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import MediaBox from '../components/MediaBox';
import Input from '../components/Input';
import { formatScore } from '../utils/ui';
function SavedDrawer({ trends, onClose, onRemove }) {
  const list = Array.isArray(trends) ? trends : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div className="saved-drawer-panel" style={{ position: 'relative', zIndex: 1, width: 'min(360px,100%)', maxWidth: 360, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Sauvegardés</h2>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{list.length} trend{list.length !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <Button variant="ghost" onClick={onClose} icon={<X size={14} />} iconOnly />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 ? (
            <EmptyState
              icon={<Bookmark size={32} />}
              title="Aucun signal sauvegardé"
              subtitle="Enregistrez un signal depuis le flux pour le retrouver ici plus tard."
              action={<Button variant="ghost" onClick={onClose}>Fermer</Button>}
            />
          ) : list.map((t) => {
            const id = t.id || t._id;
            return (
              <div className="saved-drawer-item" key={id} style={{ padding: '14px', background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: 'var(--glass)' }}>
                  <MediaBox src={t.thumbnail || t.image} alt={t.title} aspect="square" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>{t.title}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,220,80,0.14)', color: 'var(--y)', textTransform: 'uppercase' }}>{t.source || 'Source'}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Score: {formatScore(t.score)}</span>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => onRemove(id)} icon={<X size={12} />} iconOnly />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatNum(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function displaySourceLabel(source) {
  const value = String(source || '').trim();
  const key = value.toLowerCase();
  if (!value) return 'Source inconnue';
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google';
  if (key.includes('youtube')) return 'YouTube';
  return value;
}

function displayCategoryLabel(category) {
  if (!category) return null;
  const normalized = String(category).trim();
  if (!normalized) return null;
  return normalized
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatSummary(trend) {
  const raw = trend.analysis || trend.summary || trend.description;
  if (!raw) {
    return 'Analyse rapide non disponible. Consultez la page détail pour approfondir.';
  }
  const cleaned = String(raw).trim();
  if (/ai unavailable/i.test(cleaned)) {
    return 'Analyse IA indisponible pour ce signal. Consultez la page détail pour le contexte.';
  }
  return cleaned;
}

function Toast({ msg, onClose }) {
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 300 }}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.8)', color: '#fff', minWidth: 180, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>{msg}</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  );
}

function MediaPreview({ thumb, url, alt }) {
  if (!thumb) return null;
  return (
    <a href={url || '#'} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative', overflow: 'hidden' }}>
      <MediaBox src={thumb} alt={alt || 'Visuel de tendance'} aspect="16:9" />
    </a>
  );
}

function FeedCard({ trend, isSaved, onSave, onHide, onView }) {
  const id = trend._id || trend.id || trend.title;
  const summary = formatSummary(trend);
  const thumb = trend.thumbnail || trend.image || trend.poster;
  const detailUrl = trend.link || trend.image || trend.video || '#';

  return (
    <article className="feed-card">
      {thumb ? <MediaPreview thumb={thumb} url={detailUrl} alt={trend.title} /> : null}
      <div className="feed-card-body">
        <div className="feed-pill-row">
          <span className="pill pill-source">{displaySourceLabel(trend.source)}</span>
          {displayCategoryLabel(trend.category) && <span className="pill pill-category">{displayCategoryLabel(trend.category)}</span>}
        </div>

        <h2>{trend.title}</h2>

        <p className="feed-summary">{summary}</p>

        <div className="feed-card-meta">
          <span>{formatScore(trend.score)}</span>
          <span>{trend.popularity ? `${formatNum(trend.popularity)} mentions` : 'Sans données'}</span>
        </div>

        <div style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.5 }}>
          Consultez la page détail pour l’analyse IA et le contexte complet.
        </div>

        <div className="feed-card-actions">
          <Button variant="primary" onClick={onView}>Voir le signal</Button>
          <Button variant="ghost" onClick={() => onSave(id)}>{isSaved ? 'Retiré' : 'Sauvegarder'}</Button>
        </div>

        <div className="feed-card-foot">
          <Button variant="ghost" onClick={() => onHide(id)} className="feed-action-text">Masquer</Button>
        </div>
      </div>
    </article>
  );
}

const PAGE_SIZE = 24;

export default function Feed() {
  const navigate = useNavigate();
  const [baseData, setBaseData] = useState([]);
  const [hidden, setHidden] = useState([]);
  const [saved, setSaved] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, hasMore: false });
  const [toast, setToast] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loaderRef = useRef(null);

  const showToast = (msg) => setToast(msg);

  // auto-hide toast after a short delay
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const fetchSavedTrends = useCallback(async () => {
    try {
      const { data } = await api.get('/users/saved-trends');
      if (data && Array.isArray(data.items)) {
        setSavedItems(data.items);
        setSaved(data.items.map((t) => t.id || t._id));
      }
    } catch {
      showToast('Impossible de charger les signaux sauvegardés.');
    }
  }, []);

  const fetchFeed = useCallback(async (requestedPage = 1, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = { page: requestedPage, limit: PAGE_SIZE };
      if (filter && filter !== 'All') params.source = filter;
      const { data } = await api.get('/feed', { params });
      if (!data || !Array.isArray(data.items)) {
        setMeta({ page: requestedPage, limit: PAGE_SIZE, hasMore: false });
        return;
      }
      const normalized = data.items.map((t) => ({ ...t, _enriching: false }));
      setBaseData((prev) => (reset ? normalized : [...prev, ...normalized]));
      setMeta({
        page: data.meta?.page || requestedPage,
        limit: data.meta?.limit || PAGE_SIZE,
        hasMore: Boolean(data.meta?.hasMore),
      });
      setPage(requestedPage);
    } catch {
      showToast('Impossible de charger le flux pour le moment.');
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchFeed(1, true), fetchSavedTrends()]);
    })();
  }, [fetchFeed, fetchSavedTrends]);

  useEffect(() => {
    setBaseData([]);
    setPage(1);
    fetchFeed(1, true);
  }, [filter, fetchFeed]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && meta.hasMore && !loadingMore && !loading) {
          fetchFeed(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [meta.hasMore, loadingMore, loading, page, fetchFeed]);

  const handleHide = (id) => {
    setHidden((prev) => [...prev, id]);
    showToast('Trend masqué');
  };

  const handleSave = async (id) => {
    const isSaved = saved.includes(id);
    try {
      if (isSaved) {
        await api.delete(`/feed/${id}/save`);
        setSaved((prev) => prev.filter((x) => x !== id));
        setBaseData((prev) => prev.map((item) => (item._id === id ? { ...item, isSaved: false } : item)));
        showToast('Retiré');
      } else {
        await api.post(`/feed/${id}/save`);
        setSaved((prev) => [...prev, id]);
        setBaseData((prev) => prev.map((item) => (item._id === id ? { ...item, isSaved: true } : item)));
        showToast('Sauvegardé');
      }
    } catch {
      showToast(isSaved ? 'Erreur lors du retrait' : 'Erreur lors de la sauvegarde');
    }
  };

  const handleRemoveSaved = async (id) => {
    try {
      await api.delete(`/feed/${id}/save`);
      setSaved((prev) => prev.filter((x) => x !== id));
      setBaseData((prev) => prev.map((item) => (item._id === id ? { ...item, isSaved: false } : item)));
      showToast('Retiré');
      // refresh saved items list
      fetchSavedTrends();
    } catch {
      showToast('Erreur lors du retrait');
    }
  };

  const visibleTrends = baseData.filter((t) => !hidden.includes(t._id || t.id));
  const sourceCounts = visibleTrends.reduce((acc, t) => {
    const s = displaySourceLabel(t.source);
    if (!s) return acc;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const sources = ['All', ...Object.keys(sourceCounts).sort((a, b) => sourceCounts[b] - sourceCounts[a])];
  const filteredTrends = visibleTrends.filter((trend) => {
    const sourceMatch = filter === 'All' || displaySourceLabel(trend.source).toLowerCase().includes(filter.toLowerCase());
    const query = search.trim().toLowerCase();
    if (!query) return sourceMatch;
    return (
      sourceMatch &&
      ((trend.title || '').toLowerCase().includes(query) ||
        (trend.category || '').toLowerCase().includes(query) ||
        displaySourceLabel(trend.source).toLowerCase().includes(query))
    );
  });

  const handleViewDetail = (id) => navigate(`/feed/${id}`);

  return (
    <div className="page-layout">
      <Navbar />
      <main className="feed-main" style={{ paddingTop: 58, background: 'var(--bg)', overflowX: 'hidden', width: '100%' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 20px 40px', width: '100%' }}>
          <section className="feed-page-header">
            <div>
              <span className="eyebrow">Flux de découverte</span>
              <h1>Signaux récents</h1>
              <p>Explorez les dernières tendances sans être noyé par du contenu IA. Analyse manuelle disponible sur la page détail.</p>
            </div>
            <div className="feed-header-actions">
              <Button variant="ghost" onClick={() => fetchFeed(1, true)} disabled={loading} className="" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Rafraîchir
              </Button>
              <Button variant="ghost" onClick={async () => { await fetchSavedTrends(); setDrawerOpen(true); }} className="" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bookmark size={14} /> Sauvegardés{saved.length > 0 ? ` (${saved.length})` : ''}
              </Button>
            </div>
          </section>

          <section className="feed-tools">
            <div className="feed-search">
              <Search size={16} />
              <Input
                id="feed-search"
                type="search"
                aria-label="Recherche de tendances"
                placeholder="Recherche par mot-clé, source ou catégorie"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                helper="Appuyez sur Entrée pour filtrer le flux."
              />
            </div>
            <div className="feed-chip-row">
              {sources.map((source) => (
                <Button key={source} type="button" variant={filter === source ? 'primary' : 'ghost'} className={filter === source ? 'feed-chip active' : 'feed-chip'} onClick={() => setFilter(source)} style={{ padding: '6px 12px' }}>
                  {source}{source !== 'All' ? ` (${sourceCounts[source] || 0})` : ''}
                </Button>
              ))}
            </div>
          </section>

          <div className="feed-summary-row">
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{filteredTrends.length}</span> tendance{filteredTrends.length > 1 ? 's' : ''} affichée{filteredTrends.length > 1 ? 's' : ''}
            </div>
            {search && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Filtrée par «{search}»</div>}
          </div>

          <div className="feed-grid" style={{ marginTop: 14 }}>
            {loading ? (
                [1, 2, 3].map((i) => (
                  <LoadingSkeleton key={i} height="260px" radius={20} />
                ))
              ) : !filteredTrends.length ? (
              <EmptyState
                icon={<Filter size={28} />}
                title="Aucune tendance trouvée"
                subtitle="Essayez un autre mot-clé ou changez la source pour explorer plus de signaux."
                action={hidden.length > 0 ? <Button variant="ghost" onClick={() => setHidden([])}>Réafficher les tendances masquées</Button> : null}
              />
            ) : filteredTrends.map((trend) => (
              <FeedCard
                key={trend._id || trend.title}
                trend={trend}
                isSaved={saved.includes(trend._id || trend.title)}
                onSave={handleSave}
                onHide={handleHide}
                onView={() => handleViewDetail(trend._id || trend.id)}
              />
            ))}
          </div>

          <div ref={loaderRef} style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {loadingMore ? <Loader2 size={22} color="var(--y)" style={{ animation: 'spin 1s linear infinite' }} /> : !meta.hasMore && filteredTrends.length > 0 ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>✦ Tu as tout vu · Reviens plus tard</p> : null}
          </div>
        </div>
      </main>
      {drawerOpen && <SavedDrawer savedIds={saved} trends={savedItems} onClose={() => { setDrawerOpen(false); }} onRemove={handleRemoveSaved} />}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <style>{`
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translate(-50%,10px)} to{opacity:1;transform:translate(-50%,0)} }
      `}</style>
    </div>
  );
}
