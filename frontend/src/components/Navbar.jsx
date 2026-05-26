import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Zap, LayoutDashboard, Rss, Settings, Sun, Moon, LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
  const is = p => location.pathname === p;

  const links = user ? [
    { to:'/dashboard',   label:'Dashboard',   icon:<LayoutDashboard size={15}/> },
    { to:'/feed',        label:'Feed',         icon:<Rss size={15}/> },
    { to:'/preferences', label:'Preferences',  icon:<Settings size={15}/> },
  ] : [];

  /* Ferme le menu si on resize vers desktop */
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* Bloque le scroll quand menu ouvert */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        height:58,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px',
        borderBottom:'1px solid var(--divider)',
        background:'var(--bg)',
        backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
      }}>

        {/* LOGO */}
        <Link to="/" onClick={() => setMenuOpen(false)} style={{
          display:'flex', alignItems:'center', gap:9,
          fontWeight:800, fontSize:15, letterSpacing:'-.3px',
          color:'var(--text)', textDecoration:'none', flexShrink:0,
        }}>
          <div style={{ width:26,height:26,borderRadius:7,background:'var(--y)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <Zap size={13} color="#06070D" fill="#06070D"/>
          </div>
          TrendAI
        </Link>

        {/* ── DESKTOP CENTER LINKS (≥768px) ── */}
        <div className="nav-desktop-links" style={{ display:'flex', gap:2 }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 13px', borderRadius:7,
              fontSize:12, fontWeight:600, textDecoration:'none',
              color:      is(l.to) ? 'var(--y)'     : 'var(--text2)',
              background: is(l.to) ? 'var(--y-dim)' : 'transparent',
              transition:'var(--transition)',
            }}>
              {l.icon}{l.label}
            </Link>
          ))}
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>

          {/* Theme toggle */}
          <button onClick={toggle} aria-label="Toggle theme" style={{
            width:34, height:34, borderRadius:9, cursor:'pointer',
            background:'var(--glass)', border:'1px solid var(--glass-b)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--text2)', transition:'var(--transition)', flexShrink:0,
          }}>
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
          </button>

          {/* Desktop: avatar + logout */}
          {user ? (
            <div className="nav-desktop-links" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--y),#FFB800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#06070D',flexShrink:0 }}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <button onClick={handleLogout} style={{
                display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                padding:'6px 12px', borderRadius:7,
                background:'transparent', border:'1px solid var(--glass-b)',
                color:'var(--text2)', fontSize:12, fontWeight:600,
                transition:'var(--transition)',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(248,113,113,0.08)'; e.currentTarget.style.color='#F87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.3)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)'; e.currentTarget.style.borderColor='var(--glass-b)'; }}
              >
                <LogOut size={13}/> Logout
              </button>
            </div>
          ) : (
            <div className="nav-desktop-links" style={{ display:'flex', gap:8 }}>
              <Link to="/login" style={{ padding:'7px 16px',borderRadius:7,textDecoration:'none',background:'transparent',border:'1px solid var(--glass-b)',color:'var(--text2)',fontSize:12,fontWeight:600,display:'inline-flex',alignItems:'center' }}>Log in</Link>
              <Link to="/signup" style={{ padding:'7px 18px',borderRadius:7,textDecoration:'none',background:'var(--y)',color:'#06070D',fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center' }}>Get started</Link>
            </div>
          )}

          {/* ── HAMBURGER (mobile only <768px) ── */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(p => !p)}
            aria-label="Menu"
            style={{
              width:34, height:34, borderRadius:9, cursor:'pointer',
              background:'var(--glass)', border:'1px solid var(--glass-b)',
              display:'none', alignItems:'center', justifyContent:'center',
              color:'var(--text2)', flexShrink:0,
            }}
          >
            {menuOpen ? <X size={16}/> : <Menu size={16}/>}
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      {menuOpen && (
        <div style={{
          position:'fixed', inset:0, zIndex:99,
          background:'var(--bg)',
          display:'flex', flexDirection:'column',
          paddingTop:58,
          animation:'slideDown .25s ease',
        }}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:6 }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'14px 16px', borderRadius:12,
                fontSize:15, fontWeight:600, textDecoration:'none',
                color:      is(l.to) ? 'var(--y)'     : 'var(--text)',
                background: is(l.to) ? 'var(--y-dim)' : 'var(--glass)',
                border:    `1px solid ${is(l.to) ? 'var(--y-border)' : 'var(--glass-b)'}`,
              }}>
                {l.icon}{l.label}
              </Link>
            ))}

            <div style={{ height:1, background:'var(--divider)', margin:'12px 0' }}/>

            {user ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', fontSize:13, color:'var(--text2)' }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--y),#FFB800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#06070D' }}>
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>{user.name || 'Mon compte'}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{user.email}</div>
                  </div>
                </div>
                <button onClick={handleLogout} style={{ display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderRadius:12,background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',color:'#F87171',fontSize:14,fontWeight:600,cursor:'pointer',width:'100%' }}>
                  <LogOut size={16}/> Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display:'block',padding:'14px 16px',borderRadius:12,textDecoration:'none',background:'var(--glass)',border:'1px solid var(--glass-b)',color:'var(--text)',fontSize:14,fontWeight:600,textAlign:'center' }}>
                  Se connecter
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} style={{ display:'block',padding:'14px 16px',borderRadius:12,textDecoration:'none',background:'var(--y)',color:'#06070D',fontSize:14,fontWeight:800,textAlign:'center' }}>
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .nav-desktop-links { display: none !important; }
          .nav-hamburger     { display: flex !important; }
        }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}