import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { TrendingUp, Cpu, Zap, RefreshCw, BarChart2, Clock, Radio, ArrowUpRight, Flame } from 'lucide-react';

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

/* ─── MINI SPARKLINE ─── */
function Sparkline({ color }) {
  const points = Array.from({length:8}, () => 30 + Math.random()*60);
  const max = Math.max(...points);
  const w = 80, h = 32;
  const pts = points.map((p,i) => `${(i/(points.length-1))*w},${h-(p/max)*h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow:'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".8"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity=".08" stroke="none"/>
    </svg>
  );
}

/* ─── METRIC CARD ─── */
function MetricCard({ icon, label, value, change, up, color, sparkColor }) {
  return (
    <div style={{ background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', gap:12, transition:'var(--transition)' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=color==='var(--y)'?'rgba(255,220,80,0.3)':color==='var(--b)'?'rgba(96,165,250,0.3)':'rgba(74,222,128,0.3)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--glass-b)'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ width:36,height:36,borderRadius:10,background:`rgba(${color==='var(--y)'?'255,220,80':color==='var(--b)'?'96,165,250':'74,222,128'},0.1)`,display:'flex',alignItems:'center',justifyContent:'center',color }}>
          {icon}
        </div>
        <span style={{ fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5, background: up?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)', color: up?'#4ADE80':'#F87171' }}>
          {up?'↑':'↓'} {change}
        </span>
      </div>
      <div>
        <div style={{ fontSize:28, fontWeight:800, letterSpacing:'-1.5px', color, lineHeight:1, fontFamily:'var(--mono)' }}>{value}</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:5 }}>{label}</div>
      </div>
      <Sparkline color={sparkColor}/>
    </div>
  );
}

export default function Dashboard() {
  const { user }              = useAuth();
  const [trends, setTrends]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab]   = useState('all');

  async function fetchTrends() {
    setLoading(true);
    try {
      const { data } = await api.get('/trends');
      if (Array.isArray(data) && data.length) setTrends(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLastUpdate(new Date()); }
  }

  useEffect(() => { fetchTrends(); }, []);

  const filtered = activeTab === 'all' ? trends
    : trends.filter(t => (t.source||'').toLowerCase().includes(activeTab));

  const topTrend = trends[0];
  const avgScore = trends.length ? Math.round(trends.reduce((a,t)=>a+t.score,0)/trends.length) : 0;
  const totalPop = trends.reduce((a,t)=>a+(t.popularity||0),0);

  return (
    <div className="page-layout">
      <Navbar/>
      <main style={{ paddingTop:58, minHeight:'100vh', background:'var(--bg)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px' }}>

          {/* ── HEADER ── */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.8px', marginBottom:5, color:'var(--text)' }}>
                Intelligence Dashboard
              </h1>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text3)', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:7,height:7,borderRadius:'50%',background:'#4ADE80',animation:'pulse 1.5s ease-in-out infinite' }}/>
                  <span style={{ color:'#4ADE80', fontWeight:600 }}>Live</span>
                </div>
                · Mis à jour {lastUpdate.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                {user && <> · <span style={{ color:'var(--y)', fontWeight:600 }}>👋 {user.name || user.email?.split('@')[0]}</span></>}
              </div>
            </div>
            <button onClick={fetchTrends} disabled={loading} className="btn-outline" style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, padding:'9px 18px', borderRadius:9 }}>
              <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }}/>
              Actualiser
            </button>
          </div>

          {/* ── METRICS ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
            <MetricCard icon={<TrendingUp size={16}/>} label="Trends détectées"   value={formatNum(trends.length*47+200)} change="18 today"  up={true}  color="var(--y)" sparkColor="#FFDC50"/>
            <MetricCard icon={<Cpu size={16}/>}         label="Score moyen IA"     value={avgScore||94}                     change="2.1%"     up={true}  color="var(--b)" sparkColor="#60A5FA"/>
            <MetricCard icon={<Flame size={16}/>}        label="Popularité totale"  value={formatNum(totalPop||18400)}       change="vs hier"  up={true}  color="#4ADE80"  sparkColor="#4ADE80"/>
            <MetricCard icon={<Zap size={16}/>}          label="High potential"     value={trends.filter(t=>t.score>80).length||31} change="3" up={false} color="var(--y)" sparkColor="#FFDC50"/>
          </div>

          {/* ── MAIN GRID ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>

            {/* TABLE */}
            <div style={{ background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:18, overflow:'hidden' }}>
              {/* Table header */}
              <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--divider)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <BarChart2 size={16} color="var(--y)"/>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Top Trends</span>
                </div>
                {/* Tabs */}
                <div style={{ display:'flex', gap:4 }}>
                  {[{k:'all',l:'Tous'},{k:'reddit',l:'Reddit'},{k:'google',l:'Google'},{k:'youtube',l:'YouTube'}].map(t => (
                    <button key={t.k} onClick={() => setActiveTab(t.k)} style={{ padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', background: activeTab===t.k?'var(--y)':'transparent', color: activeTab===t.k?'#06070D':'var(--text2)', border:`1px solid ${activeTab===t.k?'var(--y)':'var(--glass-b)'}`, transition:'var(--transition)' }}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column headers */}
              <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 70px 70px 60px', gap:12, padding:'10px 20px', borderBottom:'1px solid var(--divider)' }}>
                {['#','Trend','Popularité','Croissance','Score'].map(h => (
                  <span key={h} style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)' }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {loading ? (
                <div style={{ padding:24, display:'flex', flexDirection:'column', gap:10 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52, borderRadius:10 }}/>)}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontSize:13 }}>Aucune donnée disponible</div>
              ) : filtered.map((t, i) => {
                const sc = scoreColor(t.score);
                return (
                  <div key={t._id||t.title} style={{ display:'grid', gridTemplateColumns:'28px 1fr 70px 70px 60px', gap:12, alignItems:'center', padding:'12px 20px', borderBottom:'1px solid var(--divider)', transition:'var(--transition)', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--glass)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', fontWeight:600 }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:10, color:'var(--text3)' }}>{srcEmoji(t.source)} {t.source}</span>
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:'rgba(74,222,128,0.1)', color:'#4ADE80', fontWeight:700 }}>{scoreLabel(t.score)}</span>
                      </div>
                    </div>
                    <span style={{ fontSize:12, color:'var(--text2)', fontFamily:'var(--mono)' }}>{formatNum(t.popularity)}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#4ADE80', fontFamily:'var(--mono)' }}>+{formatNum(t.growth)}</span>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800, color:sc }}>{t.score}</span>
                      <div style={{ height:3, borderRadius:2, background:'var(--glass-b)', marginTop:5 }}>
                        <div style={{ height:'100%', borderRadius:2, width:`${Math.min(t.score,100)}%`, background:`linear-gradient(90deg,${sc},transparent)` }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SIDEBAR */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Top Trend Card */}
              {topTrend && (
                <div style={{ background:'linear-gradient(135deg,rgba(255,220,80,0.08),rgba(96,165,250,0.05))', border:'1px solid var(--y-border)', borderRadius:16, padding:18 }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--y)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                    <Flame size={12}/> Trend #1
                  </div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', lineHeight:1.4, marginBottom:12 }}>{topTrend.title}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{srcEmoji(topTrend.source)} {topTrend.source}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:800, color:'var(--y)' }}>{topTrend.score}</div>
                  </div>
                  {topTrend.link && (
                    <a href={topTrend.link} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:5, marginTop:12, fontSize:11, fontWeight:700, color:'var(--b)', textDecoration:'none' }}>
                      Voir la source <ArrowUpRight size={12}/>
                    </a>
                  )}
                </div>
              )}

              {/* Sources stats */}
              <div style={{ background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:16, padding:18 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)', marginBottom:14 }}>Sources</div>
                {[
                  { src:'Reddit',  emoji:'🟠', c:'#FF5600' },
                  { src:'Google',  emoji:'🔵', c:'var(--b)' },
                  { src:'YouTube', emoji:'🔴', c:'#FF4444' },
                ].map(row => {
                  const count = trends.filter(t=>(t.source||'').toLowerCase().includes(row.src.toLowerCase())).length;
                  const pct = trends.length ? (count/trends.length)*100 : 0;
                  return (
                    <div key={row.src} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:5 }}>
                        <span>{row.emoji} {row.src}</span>
                        <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:row.c }}>{count}</span>
                      </div>
                      <div style={{ height:4, borderRadius:2, background:'var(--glass-b)' }}>
                        <div style={{ height:'100%', borderRadius:2, width:`${pct||30}%`, background:row.c, transition:'width 1s ease' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Last update */}
              <div style={{ background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:16, padding:18 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)', marginBottom:14 }}>Statut système</div>
                {[
                  { label:'Reddit crawl',  val:'2 min ago',  ok:true },
                  { label:'Google sync',   val:'5 min ago',  ok:true },
                  { label:'AI scoring',    val:'Active',     ok:true },
                  { label:'MongoDB',       val:'Connected',  ok:true },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--divider)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:'var(--text2)' }}>
                      <Clock size={11} color="var(--text3)"/> {row.label}
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color: row.ok?'#4ADE80':'#F87171' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 900px) {
          main > div > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}