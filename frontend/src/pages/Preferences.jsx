import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Cpu, Gamepad2, Briefcase, GraduationCap, HeartPulse, Globe, CheckCircle2, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  { id:'tech',      label:'Tech',       icon:<Cpu size={22}/>,          color:'var(--y)' },
  { id:'gaming',    label:'Gaming',     icon:<Gamepad2 size={22}/>,     color:'var(--b)' },
  { id:'business',  label:'Business',   icon:<Briefcase size={22}/>,    color:'var(--g)' },
  { id:'education', label:'Éducation',  icon:<GraduationCap size={22}/>,color:'#A78BFA'  },
  { id:'health',    label:'Santé',      icon:<HeartPulse size={22}/>,   color:'var(--r)' },
  { id:'society',   label:'Société',    icon:<Globe size={22}/>,        color:'#FB923C'  },
];

function colorDim(c) {
  const map = { 'var(--y)':'rgba(255,220,80,0.08)', 'var(--b)':'rgba(96,165,250,0.08)', 'var(--g)':'rgba(74,222,128,0.08)', '#A78BFA':'rgba(167,139,250,0.08)', 'var(--r)':'rgba(248,113,113,0.08)', '#FB923C':'rgba(251,146,60,0.08)' };
  return map[c] || 'var(--glass)';
}
function colorBorder(c) {
  const map = { 'var(--y)':'rgba(255,220,80,0.3)', 'var(--b)':'rgba(96,165,250,0.3)', 'var(--g)':'rgba(74,222,128,0.3)', '#A78BFA':'rgba(167,139,250,0.3)', 'var(--r)':'rgba(248,113,113,0.3)', '#FB923C':'rgba(251,146,60,0.3)' };
  return map[c] || 'var(--glass-b)';
}

export default function Preferences() {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSave = async () => {
    if (!selected.length) return;
    setLoading(true);
    try {
      await api.put('/users/preferences', { preferences: selected });
      navigate('/dashboard');
    } catch {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-layout">
      <Navbar/>
      <main style={{ paddingTop:58, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 28px' }}>
        <div style={{ maxWidth:640, width:'100%' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{
              fontSize:9, fontWeight:700, letterSpacing:2,
              textTransform:'uppercase', color:'var(--text3)', marginBottom:16,
            }}>Étape 1 sur 1</div>
            <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-1px', marginBottom:12 }}>
              Personnalisez votre{' '}
              <span style={{ color:'var(--y)' }}>Intelligence</span>
            </h1>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6 }}>
              Choisissez les domaines que l'IA va surveiller pour vous.
            </p>
          </div>

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:32 }}>
            {CATEGORIES.map(cat => {
              const sel = selected.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggle(cat.id)}
                  style={{
                    position:'relative',
                    padding:'24px 16px',
                    borderRadius:16,
                    border:`1px solid ${sel ? colorBorder(cat.color) : 'var(--glass-b)'}`,
                    background: sel ? colorDim(cat.color) : 'var(--glass)',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:12,
                    cursor:'pointer', transition:'var(--transition)',
                    transform: sel ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {sel && (
                    <div style={{ position:'absolute', top:10, right:10 }}>
                      <CheckCircle2 size={16} color={cat.color}/>
                    </div>
                  )}
                  <div style={{
                    width:48, height:48, borderRadius:14,
                    background: sel ? colorDim(cat.color) : 'var(--glass)',
                    border:`1px solid ${sel ? colorBorder(cat.color) : 'var(--glass-b)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: sel ? cat.color : 'var(--text3)',
                    transition:'var(--transition)',
                  }}>
                    {cat.icon}
                  </div>
                  <span style={{
                    fontSize:13, fontWeight:700,
                    color: sel ? cat.color : 'var(--text2)',
                    transition:'var(--transition)',
                  }}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Counter */}
          <div style={{ textAlign:'center', marginBottom:24, fontSize:12, color:'var(--text3)' }}>
            {selected.length === 0
              ? 'Sélectionne au moins un domaine'
              : <span><span style={{ color:'var(--y)', fontWeight:700 }}>{selected.length}</span> domaine{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}</span>
            }
          </div>

          <button
            onClick={handleSave}
            disabled={selected.length === 0 || loading}
            className="btn-primary"
            style={{
              width:'100%', justifyContent:'center',
              padding:'14px', fontSize:14,
              opacity: selected.length === 0 ? .4 : 1,
            }}
          >
            {loading ? 'Saving...' : <><span>Lancer mon Dashboard</span><ArrowRight size={16}/></>}
          </button>
        </div>
      </main>
    </div>
  );
}