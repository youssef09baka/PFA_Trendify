import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Zap, TrendingUp, Brain, Globe, ArrowRight, CheckCircle, BarChart2, Cpu, Rss } from 'lucide-react';

/* ─── LIVE TICKER DATA ─── */
const TICKER_ITEMS = [
  { emoji:'🟠', label:'AI Agents autonomes',      change:'+340%', cat:'Tech'     },
  { emoji:'🔵', label:'VR Gaming 2025',            change:'+220%', cat:'Gaming'   },
  { emoji:'🟡', label:'Green Tech Startups',       change:'+180%', cat:'Business' },
  { emoji:'🟠', label:'Prompt Engineering Jobs',   change:'+155%', cat:'Tech'     },
  { emoji:'🔵', label:'Online Health Coaching',    change:'+130%', cat:'Health'   },
  { emoji:'🟡', label:'No-Code Tools',             change:'+200%', cat:'Tech'     },
  { emoji:'🟠', label:'Micro-SaaS Creators',       change:'+140%', cat:'Business' },
  { emoji:'🔵', label:'AI Bootcamps',              change:'+300%', cat:'Education'},
];

/* ─── FLOATING ORB ─── */
function Orb({ size, top, left, right, bottom, color, delay = 0, blur = 120 }) {
  return (
    <div style={{
      position:'absolute',
      width:size, height:size,
      borderRadius:'50%',
      background:`radial-gradient(circle, ${color} 0%, transparent 70%)`,
      top, left, right, bottom,
      filter:`blur(${blur}px)`,
      pointerEvents:'none',
      animation:`orbFloat 8s ease-in-out ${delay}s infinite alternate`,
    }}/>
  );
}


/* ─── FEATURE CARD ─── */
function FeatureCard({ icon, title, desc, color, delay }) {
  return (
    <div style={{
      background:'var(--glass)', border:'1px solid var(--glass-b)',
      borderRadius:18, padding:'28px 24px',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      transition:'var(--transition)',
      animation:`fadeUp .6s ease ${delay}s both`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color === 'var(--y)' ? 'rgba(255,220,80,0.35)' : color === 'var(--b)' ? 'rgba(96,165,250,0.35)' : 'rgba(74,222,128,0.35)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-b)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ width:48,height:48,borderRadius:14,background:`rgba(${color==='var(--y)'?'255,220,80':color==='var(--b)'?'96,165,250':'74,222,128'},0.12)`,display:'flex',alignItems:'center',justifyContent:'center',color,marginBottom:18 }}>
        {icon}
      </div>
      <h3 style={{ fontSize:16, fontWeight:700, marginBottom:10, color:'var(--text)' }}>{title}</h3>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65 }}>{desc}</p>
    </div>
  );
}

/* ─── PAGE ─── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', overflowX:'hidden' }}>
      <Navbar/>

      {/* ══ HERO ══ */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', paddingTop:58, overflow:'hidden' }}>

        {/* Orbs */}
        <Orb size={500} top="-100px" left="-150px"   color="rgba(255,220,80,0.07)"  delay={0} blur={140}/>
        <Orb size={400} top="100px"  right="-120px"  color="rgba(96,165,250,0.08)"  delay={2} blur={130}/>
        <Orb size={300} bottom="0"   left="40%"      color="rgba(74,222,128,0.05)"  delay={4} blur={120}/>

        {/* Grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(var(--y-border) 1px,transparent 1px),linear-gradient(90deg,var(--y-border) 1px,transparent 1px)', backgroundSize:'50px 50px', opacity:.3, pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:1200, margin:'0 auto', padding:'80px 6vw', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>

          {/* LEFT */}
          <div>
            {/* Badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 14px 5px 6px', borderRadius:20, border:'1px solid var(--y-border)', background:'var(--y-dim)', fontSize:11, fontWeight:700, letterSpacing:'.6px', textTransform:'uppercase', color:'var(--y)', marginBottom:28 }}>
              <div style={{ width:18,height:18,borderRadius:'50%',background:'rgba(255,220,80,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--y)',animation:'pulse 2s ease-in-out infinite' }}/>
              </div>
              Propulsé par l'IA · Signaux en direct
            </div>

            <h1 style={{ fontSize:'clamp(36px,4vw,62px)', fontWeight:800, lineHeight:1.08, letterSpacing:'-2.5px', color:'var(--text)', marginBottom:22 }}>
              Prédisez les tendances de demain
              <br/>et agissez avec confiance.
            </h1>

            <p style={{ fontSize:16, color:'var(--text2)', lineHeight:1.7, maxWidth:460, marginBottom:36, fontWeight:300 }}>
              Surveillez Reddit, Google Trends et YouTube dans un tableau de bord unique, avec des tendances ordonnées par score d'opportunité.
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:48 }}>
              <Link to="/signup" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:11, background:'var(--y)', color:'#06070D', fontSize:14, fontWeight:800, textDecoration:'none', boxShadow:'0 8px 32px rgba(255,220,80,0.2)', transition:'var(--transition)' }}>
                <Zap size={16} fill="#06070D" color="#06070D"/>Commencer
              </Link>
              <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 22px', borderRadius:11, background:'var(--glass)', border:'1px solid var(--glass-b)', color:'var(--text)', fontSize:14, fontWeight:600, textDecoration:'none', transition:'var(--transition)' }}>
                Se connecter <ArrowRight size={15}/>
              </Link>
            </div>

            <div style={{ maxWidth:440, marginBottom:48, fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>
              Un suivi continu, des tendances classées par potentiel et un flux qui privilégie les signaux les plus pertinents.
            </div>
          </div>

          {/* RIGHT — Dashboard Mockup */}
          <div style={{ animation:'fadeUp .8s ease .3s both' }}>
            <div style={{ background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:20, padding:28, minHeight:420, display:'flex', flexDirection:'column', justifyContent:'center', gap:18 }}>
              <div style={{ fontSize:12, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text3)' }}>Analyse en continu</div>
              <h2 style={{ fontSize:28, fontWeight:800, color:'var(--text)', lineHeight:1.1 }}>Un aperçu clair des opportunités émergentes.</h2>
              <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>Consultez les tendances les plus pertinentes et adaptez votre stratégie sans vous perdre dans des chiffres exagérés.</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, color:'var(--text3)', fontSize:10, letterSpacing:2, textTransform:'uppercase', opacity: scrolled?0:1, transition:'opacity .3s' }}>
          <span>Faites défiler</span>
          <div style={{ width:1, height:28, background:'linear-gradient(to bottom, var(--text3), transparent)' }}/>
        </div>
      </section>


      {/* ══ FEATURES ══ */}
      <section style={{ padding:'88px 6vw', background:'var(--bg)' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', marginBottom:12 }}>Pourquoi TrendAI</div>
          <h2 style={{ fontSize:'clamp(26px,3vw,38px)', fontWeight:800, letterSpacing:'-1.5px', color:'var(--text)' }}>
            L'intelligence au service de tes{' '}
            <span style={{ color:'var(--y)' }}>décisions</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, maxWidth:1100, margin:'0 auto' }}>
          <FeatureCard delay={0}   icon={<TrendingUp size={22}/>} color="var(--y)" title="Signaux Reddit"     desc="Crawl en temps réel des posts qui explosent. Détecte les tendances 24h avant tout le monde."/>
          <FeatureCard delay={0.1} icon={<Brain size={22}/>}       color="var(--b)" title="Score IA"   desc="Chaque tendance reçoit un score d'opportunité calculé par l'IA. Priorise ce qui compte."/>
          <FeatureCard delay={0.2} icon={<Globe size={22}/>}       color="#4ADE80"  title="Google Trends"     desc="Données croisées Google Trends, YouTube et Reddit pour un signal ultra-précis."/>
          <FeatureCard delay={0.3} icon={<Zap size={22}/>}         color="var(--y)" title="Idées de contenu"  desc="L'IA génère automatiquement une idée business ou contenu pour chaque tendance détectée."/>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ padding:'88px 6vw', background:'var(--bg2)', borderTop:'1px solid var(--divider)' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', marginBottom:12 }}>Comment ça marche</div>
          <h2 style={{ fontSize:'clamp(26px,3vw,38px)', fontWeight:800, letterSpacing:'-1.5px', color:'var(--text)' }}>
            De la donnée brute à l'opportunité en{' '}
            <span style={{ color:'var(--b)' }}>3 étapes</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:20, maxWidth:900, margin:'0 auto' }}>
          {[
            { step:'01', icon:<BarChart2 size={24}/>, title:'Collecte des tendances', desc:'Reddit, Google Trends et YouTube sont surveillés en continu pour détecter des signaux émergents.', color:'var(--y)' },
            { step:'02', icon:<Cpu size={24}/>,        title:'Scoring par l\'IA',    desc:'Une IA calcule un score d\'opportunité basé sur popularité et croissance.', color:'var(--b)' },
            { step:'03', icon:<Rss size={24}/>,        title:'Feed personnalisé',    desc:'Reçois les tendances triées par score dans ton feed. Sauvegarde, filtre, agis.', color:'#4ADE80' },
          ].map((step, i) => (
            <div key={i} style={{ position:'relative', background:'var(--glass)', border:'1px solid var(--glass-b)', borderRadius:18, padding:'28px 24px', backdropFilter:'blur(12px)' }}>
              <div style={{ fontSize:48, fontWeight:900, letterSpacing:'-3px', color:'var(--glass-b)', fontFamily:'var(--mono)', lineHeight:1, marginBottom:16 }}>{step.step}</div>
              <div style={{ color:step.color, marginBottom:14 }}>{step.icon}</div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:10, color:'var(--text)' }}>{step.title}</h3>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65 }}>{step.desc}</p>
              {i < 2 && (
                <div style={{ position:'absolute', top:'50%', right:-12, transform:'translateY(-50%)', color:'var(--text3)', fontSize:18, zIndex:1 }}>›</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding:'100px 6vw', borderTop:'1px solid var(--divider)', position:'relative', overflow:'hidden' }}>
        <Orb size={400} top="-80px"  right="-100px" color="rgba(255,220,80,0.06)" delay={0} blur={120}/>
        <Orb size={300} bottom="-60px" left="-80px" color="rgba(96,165,250,0.06)"  delay={2} blur={100}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:580, margin:'0 auto', textAlign:'center' }}>
          {['Score IA en temps réel','Données Reddit & Google Trends','Feed personnalisé','Idées de contenu générées par IA'].map(item => (
            <div key={item} style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', marginBottom:10, fontSize:13, color:'var(--text2)' }}>
              <CheckCircle size={15} color="#4ADE80"/> {item}
            </div>
          ))}
          <h2 style={{ fontSize:'clamp(28px,3vw,42px)', fontWeight:800, letterSpacing:'-1.5px', color:'var(--text)', margin:'32px 0 12px' }}>
            Prêt à prévoir <span style={{ color:'var(--y)' }}>demain</span> aujourd'hui ?
          </h2>
          <p style={{ fontSize:14, color:'var(--text2)', marginBottom:32, lineHeight:1.6 }}>
            Passe du signal à l'action avec un feed clair et des opportunités identifiées par l'IA.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/signup" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', borderRadius:11, background:'var(--y)', color:'#06070D', fontSize:14, fontWeight:800, textDecoration:'none', boxShadow:'0 8px 32px rgba(255,220,80,0.2)' }}>
              <Zap size={16} fill="#06070D" color="#06070D"/>Créer mon compte gratuit
            </Link>
            <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 24px', borderRadius:11, background:'var(--glass)', border:'1px solid var(--glass-b)', color:'var(--text)', fontSize:14, fontWeight:600, textDecoration:'none' }}>
              Se connecter <ArrowRight size={15}/>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ padding:'20px 6vw', borderTop:'1px solid var(--divider)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, background:'var(--bg2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, fontWeight:800, fontSize:14, color:'var(--text)' }}>
          <div style={{ width:22,height:22,borderRadius:6,background:'var(--y)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Zap size={12} color="#06070D" fill="#06070D"/>
          </div>
          TrendAI <span style={{ fontSize:11, fontWeight:400, color:'var(--text3)', marginLeft:6 }}>· PFA ESISA Fès 2025</span>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['React 19','Vite','Tailwind v4','Node.js','MongoDB','Claude AI'].map(t => (
            <span key={t} style={{ fontSize:10, padding:'3px 9px', borderRadius:5, background:'var(--glass)', border:'1px solid var(--glass-b)', color:'var(--text3)', fontWeight:600 }}>{t}</span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes pulse    { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.4} }
        @keyframes orbFloat { from{transform:translateY(0) scale(1)} to{transform:translateY(-30px) scale(1.05)} }
        @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 767px) {
          section > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}