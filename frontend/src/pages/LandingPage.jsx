import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Zap, TrendingUp, Brain, Globe, ArrowRight, CheckCircle } from 'lucide-react';

const features = [
  { icon: <TrendingUp size={20}/>, title: 'Real-time Signals', desc: 'Reddit, Google Trends et social crawlés en continu. Aucune tendance ne t\'échappe.', color: 'var(--y)' },
  { icon: <Brain size={20}/>,       title: 'AI Scoring',        desc: 'Chaque trend reçoit un score d\'opportunité calculé par IA. Prioritise ce qui compte.', color: 'var(--b)' },
  { icon: <Globe size={20}/>,       title: 'Multi-sources',     desc: 'Données croisées depuis Reddit, Google Trends et d\'autres signaux sociaux.', color: 'var(--g)' },
];

export default function LandingPage() {
  return (
    <div className="page-layout">
      <Navbar />
      <main style={{ paddingTop:58 }}>

        {/* ── HERO ── */}
        <section style={{
          position:'relative', overflow:'hidden',
          padding:'90px 28px 80px',
          textAlign:'center',
        }}>
          <div className="bg-grid" />

          {/* Orbs */}
          <div style={{
            position:'absolute', top:'-100px', left:'50%', transform:'translateX(-50%)',
            width:500, height:500, borderRadius:'50%',
            background:'radial-gradient(circle,rgba(255,220,80,0.06) 0%,transparent 65%)',
            pointerEvents:'none',
          }}/>
          <div style={{
            position:'absolute', bottom:'-60px', left:'10%',
            width:280, height:280, borderRadius:'50%',
            background:'radial-gradient(circle,rgba(96,165,250,0.07) 0%,transparent 65%)',
            pointerEvents:'none',
          }}/>
          <div style={{
            position:'absolute', bottom:'-60px', right:'10%',
            width:240, height:240, borderRadius:'50%',
            background:'radial-gradient(circle,rgba(74,222,128,0.05) 0%,transparent 65%)',
            pointerEvents:'none',
          }}/>

          <div className="fade-up" style={{ position:'relative', zIndex:1 }}>
            {/* Badge */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'5px 14px 5px 6px',
              borderRadius:20, border:'1px solid var(--y-border)',
              background:'var(--y-dim)',
              fontSize:10, fontWeight:700, letterSpacing:'.8px',
              textTransform:'uppercase', color:'var(--y)',
              marginBottom:28,
            }}>
              <div style={{
                width:18, height:18, borderRadius:'50%',
                background:'rgba(255,220,80,0.15)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <div style={{
                  width:7, height:7, borderRadius:'50%',
                  background:'var(--y)',
                  animation:'pulse 2s ease-in-out infinite',
                }}/>
              </div>
              Powered by AI · Real-time signals
            </div>

            <h1 style={{
              fontSize:'clamp(40px,6vw,68px)',
              fontWeight:800, lineHeight:1.05,
              letterSpacing:'-2.5px',
              marginBottom:22,
              maxWidth:760, margin:'0 auto 22px',
            }}>
              Predict{' '}
              <span style={{ color:'var(--y)' }}>Tomorrow's</span>
              <br/>
              Trends{' '}
              <span style={{ color:'var(--b)' }}>Today</span>
            </h1>

            <p style={{
              fontSize:16, color:'var(--text2)', lineHeight:1.7,
              maxWidth:480, margin:'0 auto 36px', fontWeight:300,
            }}>
              Analyse Reddit, Google Trends et les signaux sociaux en temps réel.
              L'IA calcule le score d'opportunité avant que la tendance explose.
            </p>

            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <Link to="/signup" className="btn-primary" style={{ fontSize:14, padding:'13px 28px' }}>
                <Zap size={16} fill="currentColor"/>
                Start Predicting Free
              </Link>
              <Link to="/login" className="btn-outline" style={{ fontSize:14, padding:'13px 24px' }}>
                Sign in <ArrowRight size={15}/>
              </Link>
            </div>

            {/* Stats */}
            <div style={{
              display:'flex', gap:40, justifyContent:'center',
              marginTop:56, paddingTop:36,
              borderTop:'1px solid var(--divider)',
              flexWrap:'wrap',
            }}>
              {[
                { n:'12K+',  l:'Trends analyzed',    c:'var(--y)' },
                { n:'98%',   l:'Prediction accuracy', c:'var(--y)' },
                { n:'500+',  l:'Active users',        c:'var(--b)' },
                { n:'24h',   l:'Advance signal',      c:'var(--b)' },
              ].map(s => (
                <div key={s.l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:800, letterSpacing:'-1px', color:s.c }}>{s.n}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, letterSpacing:'.3px' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ padding:'64px 28px', borderTop:'1px solid var(--divider)' }}>
          <div className="container">
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <div style={{
                fontSize:9, fontWeight:700, letterSpacing:2,
                textTransform:'uppercase', color:'var(--text3)', marginBottom:12,
              }}>
                Pourquoi TrendAI
              </div>
              <h2 style={{ fontSize:32, fontWeight:800, letterSpacing:'-1px' }}>
                L'intelligence au service de vos{' '}
                <span style={{ color:'var(--y)' }}>décisions</span>
              </h2>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
              {features.map(f => (
                <div key={f.title} className="glass-card" style={{ padding:28, transition:'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--y-border)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--glass-b)'}
                >
                  <div style={{
                    width:44, height:44, borderRadius:12,
                    background:`rgba(${f.color === 'var(--y)' ? '255,220,80' : f.color === 'var(--b)' ? '96,165,250' : '74,222,128'},0.1)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:f.color, marginBottom:18,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, marginBottom:10, letterSpacing:'-.3px' }}>{f.title}</h3>
                  <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BOTTOM ── */}
        <section style={{
          padding:'64px 28px', borderTop:'1px solid var(--divider)',
          textAlign:'center',
        }}>
          <div style={{
            maxWidth:560, margin:'0 auto',
            padding:48, borderRadius:24,
            background:'var(--glass)',
            border:'1px solid var(--y-border)',
            position:'relative', overflow:'hidden',
          }}>
            <div style={{
              position:'absolute', top:-60, right:-60,
              width:180, height:180, borderRadius:'50%',
              background:'radial-gradient(circle,rgba(255,220,80,0.07) 0%,transparent 70%)',
              pointerEvents:'none',
            }}/>
            {[
              'Score IA en temps réel',
              'Données Reddit & Google Trends',
              'Feed personnalisé par domaine',
            ].map(item => (
              <div key={item} style={{
                display:'flex', alignItems:'center', gap:10,
                justifyContent:'center', marginBottom:12,
                fontSize:13, color:'var(--text2)',
              }}>
                <CheckCircle size={15} color="var(--g)"/> {item}
              </div>
            ))}
            <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:'-1px', margin:'24px 0 10px' }}>
              Prêt à prédire les tendances ?
            </h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:28 }}>
              Rejoins 500+ utilisateurs qui ont une longueur d'avance.
            </p>
            <Link to="/signup" className="btn-primary" style={{ fontSize:14, padding:'13px 32px' }}>
              <Zap size={16} fill="currentColor"/> Créer mon compte gratuit
            </Link>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          padding:'18px 28px',
          borderTop:'1px solid var(--divider)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          flexWrap:'wrap', gap:10,
        }}>
          <div style={{ fontSize:11, color:'var(--text3)' }}>
            © 2025 <span style={{ color:'var(--y)' }}>TrendAI</span> · PFA ESISA Fès
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {['React 19','Vite','Tailwind v4','Node.js'].map(t => (
              <span key={t} style={{
                fontSize:10, padding:'3px 9px', borderRadius:5,
                background:'var(--glass)', border:'1px solid var(--glass-b)',
                color:'var(--text3)', fontWeight:600,
              }}>{t}</span>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}