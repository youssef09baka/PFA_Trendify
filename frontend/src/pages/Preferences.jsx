import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Cpu, Gamepad2, Briefcase, GraduationCap, HeartPulse, Globe, Rocket, Music, CheckCircle2, ArrowRight, Sparkles, Moon, Sun } from 'lucide-react';

const CATEGORIES = [
  { id:'tech',       label:'Technologie',   sub:'IA, Dev, Data',       icon:<Cpu size={24}/>,          color:'#2563EB', bg:'rgba(37,99,235,0.08)',   border:'rgba(37,99,235,0.22)'   },
  { id:'gaming',     label:'Gaming',         sub:'VR, Esport, Mobile',  icon:<Gamepad2 size={24}/>,     color:'#0891B2', bg:'rgba(8,145,178,0.08)',   border:'rgba(8,145,178,0.22)'   },
  { id:'business',   label:'Business',       sub:'Startup, Finance',    icon:<Briefcase size={24}/>,    color:'#16A34A', bg:'rgba(22,163,74,0.08)',   border:'rgba(22,163,74,0.22)'   },
  { id:'education',  label:'Éducation',      sub:'Cours, Bootcamp',     icon:<GraduationCap size={24}/>,color:'#0EA5E9', bg:'rgba(14,165,233,0.08)',  border:'rgba(14,165,233,0.22)'  },
  { id:'health',     label:'Santé',          sub:'Fitness, Bien-être',  icon:<HeartPulse size={24}/>,   color:'#DC2626', bg:'rgba(220,38,38,0.07)',   border:'rgba(220,38,38,0.18)'   },
  { id:'society',    label:'Société',        sub:'Actualité, Culture',  icon:<Globe size={24}/>,        color:'#0284C7', bg:'rgba(2,132,199,0.08)',   border:'rgba(2,132,199,0.22)'   },
  { id:'startup',    label:'Startup',        sub:'Levées, Produits',    icon:<Rocket size={24}/>,       color:'#059669', bg:'rgba(5,150,105,0.08)',   border:'rgba(5,150,105,0.22)'   },
  { id:'creator',    label:'Créateurs',      sub:'YouTube, TikTok',     icon:<Music size={24}/>,        color:'#2563EB', bg:'rgba(37,99,235,0.08)',   border:'rgba(37,99,235,0.22)'   },
];

export default function Preferences() {
  const { user, updateUser } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
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
      const savedPreferences = data.preferences || selected;
      setSelected(savedPreferences);
      updateUser({ preferences: savedPreferences });
      setMessage('Préférences enregistrées. Redirection vers le flux...');
      setTimeout(() => navigate('/feed'), 700);
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
              <Sparkles size={13}/> Personnalisation
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
              Votre flux affichera uniquement les domaines qui vous intéressent.
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

          <div className="settings-card" style={{ marginBottom:28 }}>
            <div>
              <span className="settings-card-label">Apparence</span>
              <h2>Thème de l'interface</h2>
              <p>Gardez une interface claire le jour, ou passez en mode sombre pour les sessions longues.</p>
            </div>
            <button type="button" className="theme-toggle-card" onClick={toggleTheme} aria-label="Changer le thème">
              {dark ? <Moon size={18} /> : <Sun size={18} />}
              <span>{dark ? 'Mode sombre' : 'Mode clair'}</span>
            </button>
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
              {loading ? 'Sauvegarde...' : <><span>Lancer mon tableau de bord</span><ArrowRight size={16}/></>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
