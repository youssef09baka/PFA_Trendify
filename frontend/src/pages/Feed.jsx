import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import {
  TrendingUp, Bookmark, BookmarkCheck,
  ThumbsDown, ExternalLink, Zap, RefreshCw,
  Share2, ChevronDown, ChevronUp, X,
  Lightbulb, BarChart2, Sparkles, Loader2, Filter
} from 'lucide-react';

/* ─── HELPERS ─── */
function scoreColor(s) {
  if (s >= 100) return 'var(--y)';
  if (s >= 80)  return 'var(--b)';
  return '#4ADE80';
}
function scoreLabel(s) {
  if (s >= 100) return 'Viral';
  if (s >= 80)  return 'Hot';
  return 'Rising';
}
function formatNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return (n/1000).toFixed(1)+'K';
  return String(n);
}
function srcEmoji(s) {
  const k=(s||'').toLowerCase();
  if(k.includes('reddit'))  return '🟠';
  if(k.includes('google'))  return '🔵';
  if(k.includes('youtube')) return '🔴';
  return '📡';
}
function srcStyle(s) {
  const k=(s||'').toLowerCase();
  if(k.includes('reddit'))  return { bg:'rgba(255,86,0,0.1)',   color:'#FF5600' };
  if(k.includes('google'))  return { bg:'rgba(96,165,250,0.1)', color:'var(--b)' };
  if(k.includes('youtube')) return { bg:'rgba(255,0,0,0.1)',    color:'#FF4444' };
  return                           { bg:'rgba(255,220,80,0.1)', color:'var(--y)' };
}

/* ─── TOAST ─── */
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2200); return ()=>clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'var(--bg3)', border:'1px solid var(--glass-b)', borderRadius:12, padding:'10px 20px', fontSize:13, fontWeight:600, color:'var(--text)', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', whiteSpace:'nowrap', animation:'fadeUp .2s ease' }}>
      {msg}
    </div>
  );
}

/* ─── SAVED DRAWER ─── */
function SavedDrawer({ savedIds, trends, onClose, onRemove }) {
  const list = trends.filter(t => savedIds.includes(t._id||t.title));
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)' }}/>
      <div style={{ position:'relative', zIndex:1, width:360, height:'100%', background:'var(--bg2)', borderLeft:'1px solid var(--divider)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'20px', borderBottom:'1px solid var(--divider)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Sauvegardés</h2>
            <p style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{list.length} trend{list.length!==1?'s':''}</p>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:'var(--glass)',border:'1px solid var(--glass-b)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)',cursor:'pointer' }}>
            <X size={14}/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
          {list.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text3)' }}>
              <Bookmark size={28} style={{ marginBottom:10, opacity:.35 }}/>
              <p style={{ fontSize:13 }}>Aucun trend sauvegardé</p>
            </div>
          ) : list.map(t => {
            const id = t._id||t.title;
            const ss = srcStyle(t.source);
            return (
              <div key={id} style={{ padding:'14px', background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:12, display:'flex', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', lineHeight:1.4, marginBottom:6 }}>{t.title}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background:ss.bg, color:ss.color, textTransform:'uppercase' }}>{srcEmoji(t.source)} {t.source}</span>
                    <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }}>Score: {t.score}</span>
                  </div>
                </div>
                <button onClick={() => onRemove(id)} style={{ width:26,height:26,borderRadius:6,background:'transparent',border:'1px solid var(--glass-b)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',cursor:'pointer',flexShrink:0 }}>
                  <X size={12}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── MEDIA PREVIEW ─── */
function MediaPreview({ thumb, url }) {
  const [err, setErr] = useState(false);
  if (err || !thumb) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display:'block', position:'relative', overflow:'hidden' }}>
      <img src={thumb} alt="" onError={() => setErr(true)} style={{ width:'100%', height:220, objectFit:'cover', display:'block' }}/>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,0.5),transparent 55%)' }}/>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:48,height:48,borderRadius:'50%',background:'rgba(255,220,80,0.92)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
        <Zap size={20} color="#06070D" fill="#06070D"/>
      </div>
    </a>
  );
}

/* ─── FEED CARD ─── */
function FeedCard({ trend, isSaved, onSave, onHide }) {
  const [expanded, setExpanded] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [shared,   setShared]   = useState(false);

  const id  = trend._id||trend.title;
  const ss  = srcStyle(trend.source);
  const sc  = scoreColor(trend.score);
  const isEnriching = trend._enriching;

  function handleShare() {
    if (navigator.clipboard) navigator.clipboard.writeText(trend.link||trend.title).catch(()=>{});
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <article style={{ background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:20, overflow:'hidden', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', transition:'var(--transition)' }}>

      {/* MEDIA */}
      {trend.mediaThumb && <MediaPreview thumb={trend.mediaThumb} url={trend.mediaUrl||trend.link}/>}

      {/* CONTENT */}
      <div style={{ padding:'18px 18px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', gap:11, flex:1, minWidth:0 }}>
            <div style={{ width:42,height:42,borderRadius:12,flexShrink:0,background:ss.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>
              {srcEmoji(trend.source)}
            </div>
            <div style={{ minWidth:0 }}>
              <h2 style={{ fontSize:14, fontWeight:700, lineHeight:1.45, color:'var(--text)', marginBottom:7 }}>{trend.title}</h2>
              <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:4, textTransform:'uppercase', letterSpacing:'.5px', background:ss.bg, color:ss.color }}>{trend.source}</span>
                <span style={{ fontSize:10, color:'var(--text3)', display:'flex', alignItems:'center', gap:3 }}><BarChart2 size={10}/> {formatNum(trend.popularity)}</span>
                <span style={{ fontSize:10, color:'#4ADE80', fontWeight:700 }}>↑ +{formatNum(trend.growth)}</span>
              </div>
            </div>
          </div>

          {/* Score */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0 }}>
            <div style={{ width:46,height:46,borderRadius:'50%',border:`2px solid ${sc}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:sc, lineHeight:1 }}>{trend.score}</span>
            </div>
            <span style={{ fontSize:8, fontWeight:700, color:sc, textTransform:'uppercase', letterSpacing:.5 }}>{scoreLabel(trend.score)}</span>
          </div>
        </div>

        {/* ANALYSIS */}
        {isEnriching ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', color:'var(--text3)', fontSize:12 }}>
            <Loader2 size={14} style={{ animation:'spin 1s linear infinite', color:'var(--y)', flexShrink:0 }}/>
            Analyse IA en cours...
          </div>
        ) : trend.analysis ? (
          <>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp: expanded?'none':2 }}>
              {trend.analysis}
            </p>
            <button onClick={() => setExpanded(p=>!p)} style={{ fontSize:11, fontWeight:700, color:'var(--b)', background:'transparent', border:'none', cursor:'pointer', padding:'0 0 10px', display:'flex', alignItems:'center', gap:4 }}>
              {expanded ? <><ChevronUp size={12}/>Réduire</> : <><ChevronDown size={12}/>Voir plus</>}
            </button>
          </>
        ) : null}

        {/* IDEA */}
        {isEnriching ? (
          <div style={{ marginBottom:14, borderRadius:12, border:'1px solid var(--y-border)', background:'var(--y-dim)', padding:'12px 14px', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--y)' }}>
            <Sparkles size={13}/> Génération de l'idée...
          </div>
        ) : trend.idea && trend.idea !== 'Generated by AI' ? (
          <div style={{ marginBottom:14, borderRadius:12, border:'1px solid var(--y-border)', background:'var(--y-dim)', overflow:'hidden' }}>
            <button onClick={() => setIdeaOpen(p=>!p)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'transparent', border:'none', cursor:'pointer', color:'var(--y)' }}>
              <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:700 }}><Lightbulb size={13}/> Idée de contenu IA</span>
              {ideaOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>
            {ideaOpen && <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, padding:'0 14px 12px' }}>{trend.idea}</p>}
          </div>
        ) : null}
      </div>

      {/* STATS BAR */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderTop:'1px solid var(--divider)', borderBottom:'1px solid var(--divider)' }}>
        {[
          { label:'Score',       val:trend.score,      c:sc          },
          { label:'Popularité',  val:trend.popularity, c:'var(--b)'  },
          { label:'Croissance',  val:'+'+trend.growth, c:'#4ADE80'   },
        ].map((s,i) => (
          <div key={s.label} style={{ padding:'10px 0', textAlign:'center', borderRight: i<2?'1px solid var(--divider)':'none', background:'var(--glass)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:s.c, fontFamily:'var(--mono)' }}>{s.val}</div>
            <div style={{ fontSize:9, color:'var(--text3)', marginTop:2, textTransform:'uppercase', letterSpacing:1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ACTIONS */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 18px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', display:'flex', alignItems:'center', gap:5 }}>
          <Zap size={12} color="var(--y)" fill="var(--y)"/> {trend.source}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {trend.link && (
            <a href={trend.link} target="_blank" rel="noreferrer" style={{ width:34,height:34,borderRadius:8,background:'var(--glass)',border:'1px solid var(--glass-b)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)' }}>
              <ExternalLink size={13}/>
            </a>
          )}
          <button onClick={handleShare} style={{ width:34,height:34,borderRadius:8,cursor:'pointer',background: shared?'rgba(74,222,128,0.1)':'var(--glass)',border:`1px solid ${shared?'rgba(74,222,128,0.3)':'var(--glass-b)'}`,display:'flex',alignItems:'center',justifyContent:'center',color: shared?'#4ADE80':'var(--text2)' }}>
            <Share2 size={13}/>
          </button>
          <button onClick={() => onHide(id)} style={{ width:34,height:34,borderRadius:8,cursor:'pointer',background:'var(--glass)',border:'1px solid var(--glass-b)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)',transition:'var(--transition)' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(248,113,113,0.08)'; e.currentTarget.style.color='#F87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.3)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='var(--glass)'; e.currentTarget.style.color='var(--text2)'; e.currentTarget.style.borderColor='var(--glass-b)'; }}
          >
            <ThumbsDown size={13}/>
          </button>
          <button onClick={() => onSave(id)} style={{ width:34,height:34,borderRadius:8,cursor:'pointer',background: isSaved?'rgba(255,220,80,0.1)':'var(--glass)',border:`1px solid ${isSaved?'var(--y-border)':'var(--glass-b)'}`,display:'flex',alignItems:'center',justifyContent:'center',color: isSaved?'var(--y)':'var(--text2)',transition:'var(--transition)' }}>
            {isSaved ? <BookmarkCheck size={13}/> : <Bookmark size={13}/>}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ─── PAGE ─── */
const PAGE_SIZE = 3;

function buildPool(data, filter, hiddenIds) {
  let filtered = data.filter(t => {
    const id = t._id||t.title;
    if (hiddenIds.includes(id)) return false;
    if (filter === 'All') return true;
    return (t.source||'').toLowerCase().includes(filter.toLowerCase());
  });
  let pool = [...filtered];
  let pass = 0;
  while (pool.length > 0 && pool.length < 15 && pass < 5) {
    pool = [...pool, ...filtered.map(t => ({ ...t, _id:(t._id||t.title)+'_d'+pass+Math.random().toString(36).slice(2,5) }))];
    pass++;
  }
  return pool.slice(0, 40);
}

export default function Feed() {
  const [baseData,    setBaseData]    = useState([]);
  const [displayed,   setDisplayed]   = useState([]);
  const [hidden,      setHidden]      = useState([]);
  const [saved,       setSaved]       = useState([]);
  const [filter,      setFilter]      = useState('All');
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const loaderRef = useRef(null);

  const showToast = msg => setToast(msg);

  async function fetchFeed() {
    setLoading(true);
    try {
      const { data } = await api.get('/trends');
      if (!Array.isArray(data) || !data.length) return;
      const raw = data.map(t => ({ ...t, _enriching:true }));
      setBaseData(raw);
      const enriched = await enrichTrends(data);
      setBaseData(enriched.map(t => ({ ...t, _enriching:false })));
    } catch (e) { console.error('Feed error:', e); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchFeed(); }, []);

  useEffect(() => {
    if (!baseData.length) return;
    const pool = buildPool(baseData, filter, hidden);
    setDisplayed(pool.slice(0, PAGE_SIZE));
    setPage(1);
    setHasMore(pool.length > PAGE_SIZE);
  }, [baseData, filter]);

  useEffect(() => {
    if (!baseData.length) return;
    const pool = buildPool(baseData, filter, hidden);
    setDisplayed(pool.slice(0, page*PAGE_SIZE));
    setHasMore(pool.length > page*PAGE_SIZE);
  }, [hidden]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore();
    }, { threshold:0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, displayed]);

  function loadMore() {
    setLoadingMore(true);
    setTimeout(() => {
      const pool = buildPool(baseData, filter, hidden);
      const next = page+1;
      setDisplayed(pool.slice(0, next*PAGE_SIZE));
      setPage(next);
      setHasMore(pool.length > next*PAGE_SIZE);
      setLoadingMore(false);
    }, 700);
  }

  const handleHide = id => { setHidden(p=>[...p,id]); showToast('💤 Trend masqué'); };
  const handleSave = id => {
    setSaved(p => {
      if(p.includes(id)){ showToast('🗑 Retiré'); return p.filter(x=>x!==id); }
      showToast('🔖 Sauvegardé !'); return [...p,id];
    });
  };

  const sources = ['All', ...new Set(baseData.map(t=>t.source).filter(Boolean).map(s=>s.charAt(0).toUpperCase()+s.slice(1)))];

  return (
    <div className="page-layout">
      <Navbar/>
      <main style={{ paddingTop:58 }}>

        {/* STICKY BAR */}
        <div style={{ position:'sticky', top:58, zIndex:50, background:'var(--bg)', borderBottom:'1px solid var(--divider)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, backdropFilter:'blur(12px)' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {sources.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding:'5px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background: filter===f?'var(--y)':'var(--glass)', color: filter===f?'#06070D':'var(--text2)', border:`1px solid ${filter===f?'var(--y)':'var(--glass-b)'}`, transition:'var(--transition)' }}>{f}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={fetchFeed} disabled={loading} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:9,cursor:'pointer',background:'var(--glass)',border:'1px solid var(--glass-b)',color:'var(--text2)',fontSize:12,fontWeight:600 }}>
              <RefreshCw size={12} style={{ animation:loading?'spin 1s linear infinite':'none' }}/> Refresh
            </button>
            <button onClick={() => setDrawerOpen(true)} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:9,cursor:'pointer',background: saved.length?'rgba(255,220,80,0.1)':'var(--glass)',border:`1px solid ${saved.length?'var(--y-border)':'var(--glass-b)'}`,color: saved.length?'var(--y)':'var(--text2)',fontSize:12,fontWeight:600 }}>
              <Bookmark size={12}/> Saved {saved.length > 0 && `(${saved.length})`}
            </button>
          </div>
        </div>

        {/* FEED COLUMN */}
        <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, letterSpacing:'-.5px', marginBottom:3, color:'var(--text)' }}>Feed Intelligent</h1>
            <p style={{ fontSize:12, color:'var(--text3)' }}>
              {loading ? 'Chargement & analyse IA...' : <><span style={{ color:'var(--y)', fontWeight:700 }}>{displayed.length}</span> tendances{hidden.length>0&&<> · {hidden.length} masquées</>}</>}
            </p>
          </div>

          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height:300, borderRadius:20 }}/>)
          ) : displayed.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
              <Filter size={28} style={{ marginBottom:10, opacity:.35 }}/>
              <p style={{ fontSize:13, marginBottom:16 }}>{baseData.length===0?'Aucune donnée du serveur.':'Aucune tendance ici.'}</p>
              {hidden.length>0 && <button onClick={() => setHidden([])} style={{ fontSize:12,fontWeight:700,color:'var(--y)',background:'var(--y-dim)',border:'1px solid var(--y-border)',padding:'8px 18px',borderRadius:9,cursor:'pointer' }}>Réafficher</button>}
            </div>
          ) : displayed.map(t => (
            <FeedCard key={t._id||t.title} trend={t} isSaved={saved.includes(t._id||t.title)} onSave={handleSave} onHide={handleHide}/>
          ))}

          {/* INFINITE SCROLL TRIGGER */}
          <div ref={loaderRef} style={{ padding:'20px 0', display:'flex', justifyContent:'center', alignItems:'center' }}>
            {loadingMore ? <Loader2 size={22} color="var(--y)" style={{ animation:'spin 1s linear infinite' }}/> : !hasMore && displayed.length>0 ? <p style={{ fontSize:12, color:'var(--text3)' }}>✦ Tu as tout vu · Reviens plus tard</p> : null}
          </div>
        </div>
      </main>

      {drawerOpen && <SavedDrawer savedIds={saved} trends={baseData} onClose={() => setDrawerOpen(false)} onRemove={id => { setSaved(p=>p.filter(x=>x!==id)); showToast('🗑 Retiré'); }}/>}
      {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}

      <style>{`
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translate(-50%,10px)} to{opacity:1;transform:translate(-50%,0)} }
      `}</style>
    </div>
  );
}