import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Zap, LayoutDashboard, Rss, Settings, Sun, Moon, LogOut, Menu, X } from 'lucide-react';
import Button from './Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
  const is = p => location.pathname === p;

  const links = user ? [
    { to:'/feed',        label:'Flux',          icon:<Rss size={15}/> },
    { to:'/dashboard',   label:'Tableau',      icon:<LayoutDashboard size={15}/> },
    { to:'/preferences', label:'Préférences',   icon:<Settings size={15}/> },
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
      <nav className="app-navbar" style={{
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
        <Link className="brand-mark" to="/" onClick={() => setMenuOpen(false)} style={{
          display:'flex', alignItems:'center', gap:9,
          fontWeight:800, fontSize:15, letterSpacing:'-.3px',
          color:'var(--text)', textDecoration:'none', flexShrink:0,
        }}>
          <div className="brand-glyph" style={{ width:26,height:26,borderRadius:7,background:'var(--y)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <Zap size={13} color="#06070D" fill="#06070D"/>
          </div>
          TrendAI
        </Link>

        {/* ── DESKTOP CENTER LINKS (≥768px) ── */}
        <div className="nav-desktop-links" style={{ display:'flex', gap:10 }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} className={is(l.to) ? 'nav-item active' : 'nav-item'} style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 14px', borderRadius:10,
              fontSize:13, fontWeight:600, textDecoration:'none',
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
          <Button onClick={toggle} aria-label="Toggle theme" iconOnly variant="ghost" icon={dark ? <Sun size={15} /> : <Moon size={15} />} />

          {/* Desktop: avatar + logout */}
          {user ? (
            <div className="nav-desktop-links" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className="user-orb" style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--y),#FFB800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#06070D',flexShrink:0 }}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <Button onClick={handleLogout} variant="ghost" icon={<LogOut size={13} />}>Déconnexion</Button>
            </div>
          ) : (
            <div className="nav-desktop-links" style={{ display:'flex', gap:8 }}>
              <Link to="/login" className="btn btn-ghost nav-link">Se connecter</Link>
              <Link to="/signup" className="btn btn-primary nav-link">Commencer</Link>
            </div>
          )}

          {/* ── HAMBURGER (mobile only <768px) ── */}
          <Button className="nav-hamburger" onClick={() => setMenuOpen(p => !p)} aria-label="Menu" variant="ghost" icon={menuOpen ? <X size={16} /> : <Menu size={16} />} iconOnly />
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      {menuOpen && (
        <div className="mobile-menu-panel" style={{
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
                  <div className="user-orb" style={{ width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--y),#FFB800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#06070D' }}>
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>{user.name || 'Mon compte'}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{user.email}</div>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleLogout} icon={<LogOut size={16} />} style={{ width: '100%', justifyContent: 'center', padding: '14px 16px', fontSize: 14 }}>
                  Se déconnecter
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display:'block',padding:'14px 16px',borderRadius:12,textDecoration:'none',background:'var(--glass)',border:'1px solid var(--glass-b)',color:'var(--text)',fontSize:14,fontWeight:600,textAlign:'center' }}>
                  Se connecter
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} style={{ display:'block',padding:'14px 16px',borderRadius:12,textDecoration:'none',background:'var(--y)',color:'#06070D',fontSize:14,fontWeight:800,textAlign:'center' }}>
                  Commencer
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
