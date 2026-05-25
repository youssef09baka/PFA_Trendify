import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  TrendingUp, Cpu, Zap, RefreshCw,
  BarChart3, Clock, Radio
} from 'lucide-react';
import { catTag, scoreColor } from '../utils/ui';

const MOCK_TRENDS = [];

export default function Dashboard() {
  const { user }            = useAuth();
  const [trends, setTrends] = useState(MOCK_TRENDS);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trends');
      if (Array.isArray(data) && data.length) setTrends(data);
    } catch (error) {
      console.warn("Dashboard trends fetch failed", error.message);
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => { fetchTrends(); }, []);

  const metrics = [
    { label:'Trends détectées', value:247, change:'+18 today',  up:true,  color:'var(--y)', icon:<TrendingUp size={16}/> },
    { label:'Score moyen IA',   value:'94.2', change:'+2.1%',   up:true,  color:'var(--b)', icon:<Cpu size={16}/> },
    { label:'High potential',   value:31,  change:'-3 vs hier', up:false, color:'var(--g)', icon:<Zap size={16}/> },
  ];

  return (
    <div className="page-layout">
      <Navbar/>
      <main className="main-content" style={{ padding:'28px' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.8px', marginBottom:4 }}>
              Intelligence Dashboard
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text3)' }}>
              <Radio size={12} color="var(--g)"/>
              <span style={{ color:'var(--g)', fontWeight:600 }}>Live</span>
              · Mis à jour {lastUpdate.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
              {user && <> · Bonjour, <span style={{ color:'var(--y)', fontWeight:600 }}>{user.name || user.email?.split('@')[0]}</span></>}
            </div>
          </div>
          <button
            onClick={fetchTrends}
            disabled={loading}
            className="btn-outline"
            style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, padding:'8px 16px' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
            Refresh
          </button>
        </div>

        {/* ── METRICS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:24 }}>
          {metrics.map(m => (
            <div key={m.label} className="glass-card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{
                  width:32, height:32, borderRadius:9,
                  background:`rgba(${m.color === 'var(--y)' ? '255,220,80' : m.color === 'var(--b)' ? '96,165,250' : '74,222,128'},0.1)`,
                  display:'flex', alignItems:'center', justifyContent:'center', color:m.color,
                }}>
                  {m.icon}
                </div>
                <span className={m.up ? 'badge-up' : 'badge-down'}>{m.change}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:800, letterSpacing:'-1px', color:m.color, lineHeight:1 }}>{m.value}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>

          {/* TABLE */}
          <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{
              padding:'18px 20px',
              borderBottom:'1px solid var(--divider)',
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <BarChart3 size={16} color="var(--y)"/>
                <span style={{ fontSize:14, fontWeight:700 }}>Top Trends</span>
              </div>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Classées par score IA</span>
            </div>

            {/* Table header */}
            <div style={{
              display:'grid', gridTemplateColumns:'28px 1fr 80px 70px 56px',
              gap:12, padding:'10px 20px',
              borderBottom:'1px solid var(--divider)',
            }}>
              {['#','Trend','Source','Variation','Score'].map(h => (
                <span key={h} style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)' }}>{h}</span>
              ))}
            </div>

            {loading ? (
              <div style={{ padding:32, display:'flex', flexDirection:'column', gap:10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:44, borderRadius:9 }}/>)}
              </div>
            ) : trends.map((t, i) => (
              <div key={t._id} style={{
                display:'grid', gridTemplateColumns:'28px 1fr 80px 70px 56px',
                gap:12, alignItems:'center',
                padding:'12px 20px',
                borderBottom: i < trends.length - 1 ? '1px solid var(--divider)' : 'none',
                transition:'var(--transition)', cursor:'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background='var(--glass)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', fontWeight:600 }}>
                  {String(i+1).padStart(2,'0')}
                </span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>{t.title}</div>
                  <span className={`tag ${catTag(t.category)}`}>{t.category}</span>
                </div>
                <span style={{ fontSize:11, color:'var(--text3)' }}>{t.source}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--g)' }}>{t.change}</span>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:scoreColor(t.score) }}>
                    {t.score}
                  </span>
                  <div style={{ height:3, borderRadius:2, background:'var(--glass-b)', marginTop:5 }}>
                    <div style={{ height:'100%', borderRadius:2, width:`${t.score}%`, background:`linear-gradient(90deg,${scoreColor(t.score)},transparent)` }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SIDEBAR */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            <div className="glass-card" style={{ padding:18 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--y)' }}/>
                Catégories actives
              </div>
              {[
                { label:'Tech',     count:312, c:'var(--y)' },
                { label:'Gaming',   count:187, c:'var(--b)' },
                { label:'Business', count:143, c:'var(--g)' },
                { label:'Éducation',count:98,  c:'var(--text3)' },
              ].map(row => (
                <div key={row.label} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 0', borderBottom:'1px solid var(--divider)',
                }}>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:row.c }}>{row.count} trends</span>
                </div>
              ))}
            </div>

            <div className="glass-card" style={{ padding:18 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--b)' }}/>
                Dernière analyse
              </div>
              {[
                { label:'Reddit crawl',  val:'2 min ago' },
                { label:'G.Trends sync', val:'5 min ago' },
                { label:'AI scoring',    val:'Active', color:'var(--g)' },
              ].map(row => (
                <div key={row.label} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 0', borderBottom:'1px solid var(--divider)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'var(--text2)' }}>
                    <Clock size={11} color="var(--text3)"/> {row.label}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color: row.color || 'var(--text)' }}>{row.val}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}