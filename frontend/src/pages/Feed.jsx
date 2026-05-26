import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import {
  Bookmark,
  BookmarkCheck,
  ThumbsDown,
  ExternalLink,
  Zap,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronUp,
  X,
  Lightbulb,
  BarChart2,
  Sparkles,
  Loader2,
  Filter,
  ArrowRight
} from 'lucide-react';

function scoreColor(s) {
  if (s >= 100) return 'var(--y)';
  if (s >= 80) return 'var(--b)';
  return '#4ADE80';
}
function scoreLabel(s) {
  if (s >= 100) return 'Viral';
  if (s >= 80) return 'Hot';
  return 'Rising';
}
function formatNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
function srcEmoji(s) {
  const k = (s || '').toLowerCase();
  if (k.includes('reddit')) return '🟠';
  if (k.includes('google')) return '🔵';
  if (k.includes('youtube')) return '🔴';
  return '📡';
}
function srcStyle(s) {
  const k = (s || '').toLowerCase();
  if (k.includes('reddit')) return { bg: 'rgba(255,86,0,0.1)', color: '#FF5600' };
  if (k.includes('google')) return { bg: 'rgba(96,165,250,0.1)', color: 'var(--b)' };
  if (k.includes('youtube')) return { bg: 'rgba(255,0,0,0.1)', color: '#FF4444' };
  return { bg: 'rgba(255,220,80,0.1)', color: 'var(--y)' };
}

function Toast({ msg, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [msg, onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'var(--bg3)', border: '1px solid var(--glass-b)', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', animation: 'fadeUp .2s ease' }}>
      {msg}
    </div>
  );
}

function SavedDrawer({ savedIds, trends, onClose, onRemove }) {
  const list = trends.filter((t) => savedIds.includes(t.id || t._id));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', zIndex: 1, width: 360, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Sauvegardés</h2>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{list.length} trend{list.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--glass)', border: '1px solid var(--glass-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
              <Bookmark size={28} style={{ marginBottom: 10, opacity: .35 }} />
              <p style={{ fontSize: 13 }}>Aucun signal sauvegardé</p>
            </div>
          ) : list.map((t) => {
            const id = t.id || t._id;
            const ss = srcStyle(t.source);
            return (
              <div key={id} style={{ padding: '14px', background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 12, display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>{t.title}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: ss.bg, color: ss.color, textTransform: 'uppercase' }}>{srcEmoji(t.source)} {t.source}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Score: {t.score}</span>
                  </div>
                </div>
                <button onClick={() => onRemove(id)} style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid var(--glass-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ thumb, url }) {
  const [err, setErr] = useState(false);
  if (err || !thumb) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative', overflow: 'hidden' }}>
      <img src={thumb} alt="" onError={() => setErr(true)} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.5),transparent 55%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,220,80,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
        <Zap size={20} color="#06070D" fill="#06070D" />
      </div>
    </a>
  );
}

function FeedCard({ trend, isSaved, onSave, onHide, onView }) {
  const [expanded, setExpanded] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const id = trend._id || trend.title;
  const ss = srcStyle(trend.source);
  const sc = scoreColor(trend.score);
  const isEnriching = trend._enriching;

  function handleShare() {
    if (navigator.clipboard) navigator.clipboard.writeText(trend.link || trend.title).catch(() => {});
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <article style={{ background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', transition: 'var(--transition)' }}>
      {trend.thumbnail && <MediaPreview thumb={trend.thumbnail} url={trend.link || trend.image} />}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 11, flex: 1, minWidth: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: ss.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {srcEmoji(trend.source)}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: 'var(--text)', marginBottom: 7 }}>{trend.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.5px', background: ss.bg, color: ss.color }}>{trend.source}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><BarChart2 size={10} /> {formatNum(trend.popularity)}</span>
                <span style={{ fontSize: 10, color: '#4ADE80', fontWeight: 700 }}>↑ +{formatNum(trend.growth)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', border: `2px solid ${sc}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, color: sc, lineHeight: 1 }}>{trend.score}</span>
            </div>
            <span style={{ fontSize: 8, fontWeight: 700, color: sc, textTransform: 'uppercase', letterSpacing: .5 }}>{scoreLabel(trend.score)}</span>
          </div>
        </div>
        {isEnriching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--text3)', fontSize: 12 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--y)', flexShrink: 0 }} />
            Analyse IA en cours...
          </div>
        ) : trend.analysis ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: expanded ? 'none' : 2 }}>
              {trend.analysis}
            </p>
            <button onClick={() => setExpanded((p) => !p)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--b)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              {expanded ? <><ChevronUp size={12} />Réduire</> : <><ChevronDown size={12} />Voir plus</>}
            </button>
          </>
        ) : null}
        {isEnriching ? (
          <div style={{ marginBottom: 14, borderRadius: 12, border: '1px solid var(--y-border)', background: 'var(--y-dim)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--y)' }}>
            <Sparkles size={13} /> Génération de l'idée...
          </div>
        ) : trend.idea && trend.idea !== 'Generated by AI' ? (
          <div style={{ marginBottom: 14, borderRadius: 12, border: '1px solid var(--y-border)', background: 'var(--y-dim)', overflow: 'hidden' }}>
            <button onClick={() => setIdeaOpen((p) => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--y)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}><Lightbulb size={13} /> Idée de contenu IA</span>
              {ideaOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {ideaOpen && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, padding: '0 14px 12px' }}>{trend.idea}</p>}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }}>
        {[
          { label: 'Score', val: trend.score, c: sc },
          { label: 'Popularité', val: trend.popularity, c: 'var(--b)' },
          { label: 'Croissance', val: '+' + trend.growth, c: '#4ADE80' }
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '10px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--divider)' : 'none', background: 'var(--glass)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: s.c, fontFamily: 'var(--mono)' }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={12} color='var(--y)' fill='var(--y)' /> {trend.source}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {trend.link && (
            <a href={trend.link} target='_blank' rel='noreferrer' className='icon-button' style={{ textDecoration: 'none' }}>
              <ExternalLink size={13} />
            </a>
          )}
          <button onClick={onView} className='icon-button' aria-label='Voir la tendance'>
            <ArrowRight size={13} />
          </button>
          <button onClick={handleShare} className='icon-button' aria-label='Copier le lien' style={{ background: shared ? 'rgba(74,222,128,0.12)' : undefined, borderColor: shared ? 'rgba(74,222,128,0.3)' : undefined, color: shared ? '#4ADE80' : undefined }}>
            <Share2 size={13} />
          </button>
          <button onClick={() => onHide(id)} className='icon-button' aria-label='Masquer la tendance'>
            <ThumbsDown size={13} />
          </button>
          <button onClick={() => onSave(id)} className='icon-button' aria-label={isSaved ? 'Retirer des sauvegardes' : 'Ajouter aux sauvegardes'} style={{ background: isSaved ? 'rgba(255,220,80,0.1)' : undefined, borderColor: isSaved ? 'var(--y-border)' : undefined, color: isSaved ? 'var(--y)' : undefined }}>
            {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
        </div>
      </div>
    </article>
  );
}

const PAGE_SIZE = 12;

export default function Feed() {
  const navigate = useNavigate();
  const [baseData, setBaseData] = useState([]);
  const [hidden, setHidden] = useState([]);
  const [saved, setSaved] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, hasMore: false });
  const [toast, setToast] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loaderRef = useRef(null);

  const showToast = (msg) => setToast(msg);

  async function fetchSavedTrends() {
    try {
      const { data } = await api.get('/users/saved-trends');
      if (data && Array.isArray(data.items)) {
        setSaved(data.items.map((t) => t.id || t._id));
      }
    } catch (err) {
      console.warn('Failed to load saved trends:', err);
    }
  }

  async function fetchFeed(requestedPage = 1, reset = false) {
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
    } catch (e) {
      console.error('Feed error:', e);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }

  useEffect(() => {
    (async () => {
      await Promise.all([fetchFeed(1, true), fetchSavedTrends()]);
    })();
  }, []);

  useEffect(() => {
    setBaseData([]);
    setPage(1);
    fetchFeed(1, true);
  }, [filter]);

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
  }, [meta.hasMore, loadingMore, loading, page]);

  const handleHide = (id) => {
    setHidden((prev) => [...prev, id]);
    showToast('💤 Trend masqué');
  };

  const handleSave = async (id) => {
    const isSaved = saved.includes(id);
    try {
      if (isSaved) {
        await api.delete(`/feed/${id}/save`);
        setSaved((prev) => prev.filter((x) => x !== id));
        setBaseData((prev) => prev.map((item) => (item._id === id ? { ...item, isSaved: false } : item)));
        showToast('🗑 Retiré');
      } else {
        await api.post(`/feed/${id}/save`);
        setSaved((prev) => [...prev, id]);
        setBaseData((prev) => prev.map((item) => (item._id === id ? { ...item, isSaved: true } : item)));
        showToast('🔖 Sauvegardé !');
      }
    } catch (err) {
      console.error(isSaved ? 'Error unsaving:' : 'Error saving:', err);
      showToast(isSaved ? 'Erreur lors du retrait' : 'Erreur lors de la sauvegarde');
    }
  };

  const handleRemoveSaved = async (id) => {
    try {
      await api.delete(`/feed/${id}/save`);
      setSaved((prev) => prev.filter((x) => x !== id));
      setBaseData((prev) => prev.map((item) => (item._id === id ? { ...item, isSaved: false } : item)));
      showToast('🗑 Retiré');
    } catch (err) {
      console.error('Error removing saved trend:', err);
      showToast('Erreur lors du retrait');
    }
  };

  const visibleTrends = baseData.filter((t) => !hidden.includes(t._id || t.id));
  const sources = ['All', ...new Set(baseData.map((t) => t.source).filter(Boolean))];

  const handleViewDetail = (id) => navigate(`/feed/${id}`);

  return (
    <div className="page-layout">
      <Navbar />
      <main style={{ paddingTop: 58 }}>
        <div style={{ position: 'sticky', top: 58, zIndex: 50, background: 'var(--bg)', borderBottom: '1px solid var(--divider)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sources.map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === f ? 'var(--y)' : 'var(--glass)', color: filter === f ? '#06070D' : 'var(--text2)', border: `1px solid ${filter === f ? 'var(--y)' : 'var(--glass-b)'}`, transition: 'var(--transition)' }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => fetchFeed(1, true)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, cursor: 'pointer', background: 'var(--glass)', border: '1px solid var(--glass-b)', color: 'var(--text2)', fontSize: 12, fontWeight: 600 }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Rafraîchir
            </button>
            <button onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, cursor: 'pointer', background: saved.length ? 'rgba(255,220,80,0.1)' : 'var(--glass)', border: `1px solid ${saved.length ? 'var(--y-border)' : 'var(--glass-b)'}`, color: saved.length ? 'var(--y)' : 'var(--text2)', fontSize: 12, fontWeight: 600 }}>
              <Bookmark size={12} /> Sauvegardés {saved.length > 0 && `(${saved.length})`}
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.5px', marginBottom: 3, color: 'var(--text)' }}>Feed Intelligent</h1>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>
              {loading ? 'Chargement & analyse IA...' : <><span style={{ color: 'var(--y)', fontWeight: 700 }}>{visibleTrends.length}</span> tendances{hidden.length > 0 && <> · {hidden.length} masquées</>}</>}
            </p>
          </div>
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 20 }} />)
          ) : !visibleTrends.length ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
              <Filter size={28} style={{ marginBottom: 10, opacity: .35 }} />
              <p style={{ fontSize: 13, marginBottom: 16 }}>{baseData.length === 0 ? 'Aucune donnée du serveur.' : 'Aucune tendance ici.'}</p>
              {hidden.length > 0 && <button onClick={() => setHidden([])} style={{ fontSize: 12, fontWeight: 700, color: 'var(--y)', background: 'var(--y-dim)', border: '1px solid var(--y-border)', padding: '8px 18px', borderRadius: 9, cursor: 'pointer' }}>Réafficher</button>}
            </div>
          ) : visibleTrends.map((t) => (
            <FeedCard key={t._id || t.title} trend={t} isSaved={saved.includes(t._id || t.title)} onSave={handleSave} onHide={handleHide} onView={() => handleViewDetail(t._id || t.id)} />
          ))}
          <div ref={loaderRef} style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {loadingMore ? <Loader2 size={22} color="var(--y)" style={{ animation: 'spin 1s linear infinite' }} /> : !meta.hasMore && visibleTrends.length > 0 ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>✦ Tu as tout vu · Reviens plus tard</p> : null}
          </div>
        </div>
      </main>
      {drawerOpen && <SavedDrawer savedIds={saved} trends={baseData} onClose={() => setDrawerOpen(false)} onRemove={handleRemoveSaved} />}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <style>{`
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translate(-50%,10px)} to{opacity:1;transform:translate(-50%,0)} }
      `}</style>
    </div>
  );
}
