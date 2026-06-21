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
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import MediaBox from '../components/MediaBox';
import Input from '../components/Input';
import { formatScore } from '../utils/ui';
import { getCardMediaUrl } from '../utils/media';
import { applyFeedMix, getSeenTrendIds, rememberTrendView } from '../utils/feedMix';
function SavedDrawer({ trends, onClose, onRemove }) {
  const list = Array.isArray(trends) ? trends : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div className="saved-drawer-panel" style={{ position: 'relative', zIndex: 1, width: 'min(360px,100%)', maxWidth: 360, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Sauvegardés</h2>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{list.length} signal{list.length > 1 ? 's' : ''}</p>
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
                {getCardMediaUrl(t) ? (
                  <div style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: 'var(--glass)' }}>
                    <MediaBox key={`${t.id || t._id || 'saved'}:${getCardMediaUrl(t) || 'none'}`} src={getCardMediaUrl(t)} alt={t.title} aspect="square" />
                  </div>
                ) : null}
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
    <a href={url || '#'} className="feed-card-media-link" onClick={(event) => { if (!url) event.preventDefault(); }}>
      <MediaBox key={`${thumb || 'thumb'}:${url || 'detail'}`} src={thumb} alt={alt || 'Visuel de tendance'} aspect="16:9" />
    </a>
  );
}

function FeedCard({ trend, isSaved, onSave, onView }) {
  const id = trend._id || trend.id || trend.title;
  const summary = formatSummary(trend);
  const thumb = getCardMediaUrl(trend);
  const detailUrl = `/feed/${id}`;

  return (
    <article className="feed-card">
      {thumb ? <MediaPreview thumb={thumb} url={detailUrl} alt={trend.title} /> : null}
      <div className="feed-card-body">
        <div className="feed-card-copy">
          <div className="feed-pill-row">
            <span className="pill pill-source">{displaySourceLabel(trend.source)}</span>
          </div>

          <h2 className="feed-card-title">{trend.title}</h2>

          <p className="feed-summary">{summary}</p>

          <div className="feed-card-meta">
            <span>{formatScore(trend.score)}</span>
            <span>{trend.popularity ? `${formatNum(trend.popularity)} mentions` : 'Sans données'}</span>
          </div>
        </div>

        <div className="feed-card-footer">
          <div className="feed-card-note">Consultez la page détail pour l’analyse IA et le contexte complet.</div>

          <div className="feed-card-actions">
            <Button variant="primary" onClick={() => onView(id)}>Lire la suite</Button>
            <Button variant="ghost" onClick={() => onSave(id)}>{isSaved ? 'Retiré' : 'Sauvegarder'}</Button>
          </div>

          <div className="feed-card-foot">
            <span>Analyse détaillée disponible</span>
          </div>
        </div>
      </div>
    </article>
  );
}

const PAGE_SIZE = 24;

const dedupeTrends = (items = []) => {
  const seen = new Map();
  return (items || []).filter((item) => {
    const id = String(item?._id || item?.id || item?.slug || item?.title || '');
    if (!id || seen.has(id)) return false;
    seen.set(id, true);
    return true;
  });
};

export default function Feed() {
  const navigate = useNavigate();
  const [baseData, setBaseData] = useState([]);
  const [hidden, setHidden] = useState([]);
  const [saved, setSaved] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const sourceOptions = ['Newest', 'Google', 'Reddit'];
  const [filter, setFilter] = useState('Newest');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, hasMore: false });
  const observerTriggerCountRef = useRef(0);
  const [toast, setToast] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loaderRef = useRef(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const observerActiveRef = useRef(false);

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
    const nextPage = Number.isFinite(requestedPage) ? Number(requestedPage) : pageRef.current + 1;

    if (loadingRef.current || (!reset && !hasMoreRef.current)) {
      return;
    }

    if (!reset && nextPage <= pageRef.current) {
      return;
    }

    loadingRef.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    let params = { page: nextPage, limit: PAGE_SIZE, seen: getSeenTrendIds().join(',') };

    try {
      if (filter && filter !== 'Newest') params.source = filter;

      const response = await api.get('/feed', { params });

      const { data } = response;
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const normalized = dedupeTrends(rawItems.map((t) => ({ ...t, _enriching: false })));
      const nextHasMore = Boolean(data?.meta?.hasMore);
      const nextPageNumber = Number(data?.meta?.page || nextPage);
      setBaseData((prev) => {
        const merged = reset ? normalized : dedupeTrends([...prev, ...normalized]);
        return merged;
      });

      pageRef.current = nextPageNumber;
      hasMoreRef.current = nextHasMore;
      setMeta((prev) => ({
        ...prev,
        page: nextPageNumber,
        limit: Number(data?.meta?.limit || PAGE_SIZE),
        hasMore: nextHasMore,
        sourceCounts: data?.meta?.sourceCounts || {},
        categoryCounts: data?.meta?.categoryCounts || {}
      }));
    } catch (error) {
      console.warn('[FEED-PAGINATION] request failed', {
        page: nextPage,
        reset,
        filter,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        message: error?.message,
        code: error?.code,
        url: error?.config?.url,
        params,
        timestamp: Date.now(),
      });
      showToast('Impossible de charger le flux pour le moment.');
    } finally {
      loadingRef.current = false;
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }, [filter]);

  const loadNextPage = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return false;
    const nextPage = pageRef.current + 1;
    if (!Number.isFinite(nextPage) || nextPage < 2) return false;
    void fetchFeed(nextPage, false);
    return true;
  }, [fetchFeed]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchFeed(1, true), fetchSavedTrends()]);
    })();
  }, [fetchFeed, fetchSavedTrends]);

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;

    const timer = window.setTimeout(() => {
      void fetchFeed(1, true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [filter, fetchFeed]);

  const createObserver = useCallback(() => {
    if (!loaderRef.current) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
      observerActiveRef.current = false;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((item) => item?.isIntersecting);
        if (!entry) return;

        observerTriggerCountRef.current += 1;
        observerActiveRef.current = true;

        if (!hasMoreRef.current || loadingRef.current) return;

        void loadNextPage();
      },
      { threshold: 0.1, rootMargin: '240px 0px' }
    );

    observer.observe(loaderRef.current);
    observerRef.current = observer;
    observerActiveRef.current = true;
  }, [loadNextPage]);

  useEffect(() => {
    createObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      observerActiveRef.current = false;
    };
  }, [createObserver]);

  useEffect(() => {
    if (!loaderRef.current || !hasMoreRef.current || loadingRef.current) return;
    if (observerRef.current && observerActiveRef.current) return;
    createObserver();
  }, [meta.hasMore, loading, loadNextPage, filter, createObserver]);

  useEffect(() => {
    if (!hasMoreRef.current || loadingRef.current) {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      return;
    }

    const scheduledPage = pageRef.current;
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
    }

    fallbackTimerRef.current = window.setTimeout(() => {
      if (!hasMoreRef.current || loadingRef.current) return;
      if (pageRef.current !== scheduledPage) return;
      if (!observerRef.current || !observerActiveRef.current) {
        createObserver();
      }
      void loadNextPage();
    }, 3500);

    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [baseData.length, meta.hasMore, loading, loadingMore, loadNextPage, filter, createObserver]);

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
  const filteredTrends = visibleTrends.filter((trend) => {
    const sourceValue = String(trend.source || '').toLowerCase();
    const sourceMatch = filter === 'Newest' ||
      (filter === 'Google' && sourceValue.includes('google')) ||
      (filter === 'Reddit' && sourceValue.includes('reddit'));
    const query = search.trim().toLowerCase();
    if (!query) return sourceMatch;
    return (
      sourceMatch &&
      ((trend.title || '').toLowerCase().includes(query) ||
        (trend.category || '').toLowerCase().includes(query) ||
        sourceValue.includes(query))
    );
  });

  // Preserve strict chronological order when the feed is already sorted by newest.
  const personalizedTrends = applyFeedMix(filteredTrends, getSeenTrendIds(), {
    preserveOrder: filter === 'Newest' || meta.page > 1,
    sortMode: filter === 'Newest' ? 'newest' : undefined
  });

  const handleViewDetail = (id) => {
    rememberTrendView(id);
    navigate(`/feed/${id}`);
  };

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
              {sourceOptions.map((sourceOption) => (
                <Button
                  key={sourceOption}
                  type="button"
                  variant={filter === sourceOption ? 'primary' : 'ghost'}
                  className={filter === sourceOption ? 'feed-chip active' : 'feed-chip'}
                  onClick={() => setFilter(sourceOption)}
                  style={{ padding: '6px 12px' }}
                >
                  {sourceOption}
                </Button>
              ))}
            </div>
          </section>

          <div className="feed-summary-row">
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{personalizedTrends.length}</span> tendance{personalizedTrends.length > 1 ? 's' : ''} affichée{personalizedTrends.length > 1 ? 's' : ''}
            </div>
            {search && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Filtrée par «{search}»</div>}
            {meta.hasMore && !loading && !loadingMore ? (
              <Button variant="ghost" onClick={() => void loadNextPage()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Charger plus
              </Button>
            ) : null}
          </div>

          <div className="feed-grid" style={{ marginTop: 14 }}>
            {loading ? (
                [1, 2, 3].map((i) => (
                  <LoadingSkeleton key={i} height="260px" radius={20} />
                ))
              ) : !personalizedTrends.length ? (
              <EmptyState
                icon={<Filter size={28} />}
                title="Aucune tendance trouvée"
                subtitle="Essayez un autre mot-clé ou changez la source pour explorer plus de signaux."
                action={hidden.length > 0 ? <Button variant="ghost" onClick={() => setHidden([])}>Réafficher les tendances masquées</Button> : null}
              />
            ) : personalizedTrends.map((trend) => (
              <FeedCard
                key={trend._id || trend.title}
                trend={trend}
                isSaved={saved.includes(trend._id || trend.title)}
                onSave={handleSave}
                onView={() => handleViewDetail(trend._id || trend.id)}
              />
            ))}
          </div>

          <div ref={loaderRef} style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {loadingMore ? <Loader2 size={22} color="var(--y)" style={{ animation: 'spin 1s linear infinite' }} /> : !meta.hasMore && personalizedTrends.length > 0 ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>✦ Tu as tout vu · Reviens plus tard</p> : null}
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
