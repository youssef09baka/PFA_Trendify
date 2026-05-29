import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Cpu, Gamepad2, Briefcase, GraduationCap, HeartPulse, Globe, Rocket, Music, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { id:'tech',       label:'Technologie',   sub:'IA, Dev, Data',       icon:<Cpu size={24}/>,         color:'#FFDC50', bg:'rgba(255,220,80,0.1)',   border:'rgba(255,220,80,0.3)'   },
  { id:'gaming',     label:'Gaming',         sub:'VR, Esport, Mobile',  icon:<Gamepad2 size={24}/>,    color:'#60A5FA', bg:'rgba(96,165,250,0.1)',   border:'rgba(96,165,250,0.3)'   },
  { id:'business',   label:'Business',       sub:'Startup, Finance',    icon:<Briefcase size={24}/>,   color:'#4ADE80', bg:'rgba(74,222,128,0.1)',   border:'rgba(74,222,128,0.3)'   },
  { id:'education',  label:'Éducation',      sub:'Cours, Bootcamp',     icon:<GraduationCap size={24}/>,color:'#A78BFA',bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.3)'  },
  { id:'health',     label:'Santé',          sub:'Fitness, Bien-être',  icon:<HeartPulse size={24}/>,  color:'#F87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.3)'  },
  { id:'society',    label:'Société',        sub:'Actualité, Culture',  icon:<Globe size={24}/>,       color:'#FB923C', bg:'rgba(251,146,60,0.1)',  border:'rgba(251,146,60,0.3)'   },
  { id:'startup',    label:'Startup',        sub:'Levées, Produits',    icon:<Rocket size={24}/>,      color:'#60A5FA', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.3)'   },
  { id:'creator',    label:'Créateurs',      sub:'YouTube, TikTok',     icon:<Music size={24}/>,       color:'#F472B6', bg:'rgba(244,114,182,0.1)', border:'rgba(244,114,182,0.3)'  },
];

export default function Preferences() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(() => Array.isArray(user?.preferences) ? user.preferences : []);
  const [loading,  setLoading]  = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  const handleSave = async () => {
    if (!selected.length) {
      setMessage('Choisissez au moins une catégorie avant de sauvegarder.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.put('/users/preferences', { preferences: selected });
      setSelected(data.preferences || selected);
      setMessage('Préférences enregistrées. Redirection vers le dashboard...');
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const pct = Math.round((selected.length / CATEGORIES.length) * 100);

  return (
    <div className="page-layout" style={{ background:'var(--bg)', minHeight:'100vh' }}>
      <Navbar/>
      <main style={{ paddingTop:58, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'80px 24px' }}>
        <div style={{ maxWidth:700, width:'100%' }}>

          {/* HEADER */}
          <div style={{ textAlign:'center', marginBottom:44 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', borderRadius:20, border:'1px solid var(--y-border)', background:'var(--y-dim)', fontSize:11, fontWeight:700, color:'var(--y)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:20 }}>
              <Sparkles size={13}/> Personnalisation IA
            </div>
            {message && (
              <div style={{ margin:'0 auto 18px', maxWidth:520, color:'var(--text)', fontSize:13, padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                {message}
              </div>
            )}
            <h1 style={{ fontSize:'clamp(26px,3vw,38px)', fontWeight:800, letterSpacing:'-1.2px', color:'var(--text)', marginBottom:12 }}>
              Choisissez vos domaines d'intérêt
            </h1>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6, maxWidth:420, margin:'0 auto' }}>
              L'IA va surveiller ces catégories en temps réel et personnaliser votre feed selon vos choix.
            </p>
          </div>

          {/* PROGRESS BAR */}
          <div style={{ marginBottom:28, padding:'14px 18px', borderRadius:14, background:'var(--glass)', border:'1px solid var(--glass-b)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>
                {selected.length === 0
                  ? 'Sélectionne au moins 1 domaine'
                  : <><span style={{ color:'var(--y)', fontWeight:800 }}>{selected.length}</span> domaine{selected.length>1?'s':''} sélectionné{selected.length>1?'s':''}</>
                }
              </span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--y)', fontFamily:'var(--mono)' }}>{pct}%</span>
            </div>
            <div style={{ height:5, borderRadius:3, background:'var(--glass-b)' }}>
              <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:'linear-gradient(90deg,var(--y),#FFB800)', transition:'width .4s ease' }}/>
            </div>
          </div>

          {/* GRID */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:28 }}>
            {CATEGORIES.map(cat => {
              const sel = selected.includes(cat.id);
              return (
                <button key={cat.id} onClick={() => toggle(cat.id)} style={{
                  position:'relative',
                  padding:'22px 16px',
                  borderRadius:16,
                  border:`1px solid ${sel ? cat.border : 'var(--glass-b)'}`,
                  background: sel ? cat.bg : 'var(--glass)',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                  cursor:'pointer',
                  transition:'var(--transition)',
                  transform: sel ? 'translateY(-3px)' : 'none',
                  boxShadow: sel ? `0 8px 24px ${cat.bg}` : 'none',
                }}>
                  {sel && (
                    <div style={{ position:'absolute', top:10, right:10 }}>
                      <CheckCircle2 size={15} color={cat.color}/>
                    </div>
                  )}
                  <div style={{
                    width:52, height:52, borderRadius:14,
                    background: sel ? cat.bg : 'var(--glass-b)',
                    border:`1px solid ${sel ? cat.border : 'var(--glass-b)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: sel ? cat.color : 'var(--text3)',
                    transition:'var(--transition)',
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:700, color: sel ? cat.color : 'var(--text2)', marginBottom:3, transition:'var(--transition)' }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{cat.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button
              onClick={() => setSelected(CATEGORIES.map(c=>c.id))}
              style={{ padding:'11px 20px', borderRadius:10, background:'var(--glass)', border:'1px solid var(--glass-b)', color:'var(--text2)', fontSize:13, fontWeight:600, cursor:'pointer', transition:'var(--transition)' }}
            >
              Tout sélectionner
            </button>
            <button
              onClick={handleSave}
              disabled={selected.length === 0 || loading}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'13px 32px', borderRadius:10,
                background: selected.length ? 'var(--y)' : 'var(--glass-b)',
                color: selected.length ? '#06070D' : 'var(--text3)',
                fontSize:14, fontWeight:800, cursor: selected.length ? 'pointer' : 'not-allowed',
                border:'none', transition:'var(--transition)',
                boxShadow: selected.length ? '0 8px 24px rgba(255,220,80,0.2)' : 'none',
              }}
            >
              {loading ? 'Sauvegarde...' : <><span>Lancer mon Dashboard</span><ArrowRight size={16}/></>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}