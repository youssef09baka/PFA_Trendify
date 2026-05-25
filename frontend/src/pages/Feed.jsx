import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { TrendingUp, Clock, Share2, ExternalLink, Filter, Zap, RefreshCw } from 'lucide-react';
import { catTag, scoreColor } from '../utils/ui';

const MOCK = [];

const FILTERS = ['All','Tech','Gaming','Business','Health','Education'];

export default function Feed() {
  const [trends, setTrends]   = useState(MOCK);
  const [filter, setFilter]   = useState('All');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(null);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trends');
      if (Array.isArray(data) && data.length) setTrends(data);
    } catch (error) {
      console.warn("Feed fetch failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, []);

  const displayed = filter === 'All'
    ? trends
    : trends.filter(t => t.category?.toLowerCase() === filter.toLowerCase());

  const handleShare = (id, title) => {
    navigator.clipboard?.writeText(title);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="page-layout">
      <Navbar/>
      <main className="main-content" style={{ padding:'28px' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.8px', marginBottom:4 }}>
              Feed Intelligent
            </h1>
            <p style={{ fontSize:13, color:'var(--text3)' }}>
              Analyses prédictives · <span style={{ color:'var(--y)', fontWeight:600 }}>{displayed.length} tendances</span> trouvées
            </p>
          </div>
          <button
            onClick={fetchFeed}
            disabled={loading}
            className="btn-outline"
            style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, padding:'8px 16px' }}
          >
            <RefreshCw size={13}/>
            Refresh
          </button>
        </div>

        {/* ── FILTERS ── */}
        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:'6px 16px', borderRadius:20,
                fontSize:12, fontWeight:600,
                background: filter === f ? 'var(--y)' : 'var(--glass)',
                color: filter === f ? '#06070D' : 'var(--text2)',
                border: `1px solid ${filter === f ? 'var(--y)' : 'var(--glass-b)'}`,
                transition:'var(--transition)', cursor:'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── CARDS GRID ── */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:220, borderRadius:16 }}/>)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {displayed.map(t => (
              <div
                key={t._id}
                className="glass-card"
                style={{ padding:22, transition:'var(--transition)', cursor:'pointer', display:'flex', flexDirection:'column', gap:0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--y-border)'; e.currentTarget.style.transform='translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--glass-b)'; e.currentTarget.style.transform='translateY(0)'; }}
              >
                {/* Top row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1, minWidth:0 }}>
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background:'rgba(255,220,80,0.08)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <TrendingUp size={16} color="var(--y)"/>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <h3 style={{
                        fontSize:13, fontWeight:700, lineHeight:1.4,
                        marginBottom:6, color:'var(--text)',
                      }}>{t.title}</h3>
                      <span className={`tag ${catTag(t.category)}`}>{t.category}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="score-ring" style={{ borderColor:scoreColor(t.score), color:scoreColor(t.score) }}>
                    {t.score}
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  fontSize:12, color:'var(--text2)', lineHeight:1.65,
                  marginBottom:16, flex:1,
                }}>
                  {t.description}
                </p>

                {/* Footer */}
                <div style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  paddingTop:14, borderTop:'1px solid var(--divider)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:11, color:'var(--text3)' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <Clock size={12}/> {t.time}
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--b)', fontWeight:600 }}>
                      <Zap size={12} fill="var(--b)"/> {t.source}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {t.link && t.link !== '#' && (
                      <a href={t.link} target="_blank" rel="noreferrer" style={{
                        width:30, height:30, borderRadius:8,
                        background:'var(--glass)', border:'1px solid var(--glass-b)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'var(--text3)', transition:'var(--transition)',
                      }}>
                        <ExternalLink size={13}/>
                      </a>
                    )}
                    <button
                      onClick={() => handleShare(t._id, t.title)}
                      style={{
                        width:30, height:30, borderRadius:8,
                        background: copied === t._id ? 'rgba(74,222,128,0.1)' : 'var(--glass)',
                        border:`1px solid ${copied === t._id ? 'rgba(74,222,128,0.3)' : 'var(--glass-b)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: copied === t._id ? 'var(--g)' : 'var(--text3)',
                        transition:'var(--transition)',
                        cursor:'pointer',
                      }}
                    >
                      <Share2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
            <Filter size={32} style={{ marginBottom:12, opacity:.4 }}/>
            <p style={{ fontSize:14 }}>Aucune tendance dans cette catégorie pour l'instant.</p>
          </div>
        )}
      </main>
    </div>
  );
}