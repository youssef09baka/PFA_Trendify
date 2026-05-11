import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Zap, LayoutDashboard, Rss, Settings,
  Sun, Moon, LogOut, Menu, X
} from 'lucide-react';

export default function Navbar() {
  const { user, logout }  = useAuth();
  const { dark, toggle }  = useTheme();
  const location          = useLocation();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const is = (p) => location.pathname === p;

  const links = user ? [
    { to: '/dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={15}/> },
    { to: '/feed',        label: 'Feed',         icon: <Rss size={15}/> },
    { to: '/preferences', label: 'Preferences',  icon: <Settings size={15}/> },
  ] : [];

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100,
      height:'58px', display:'flex', alignItems:'center',
      justifyContent:'space-between', padding:'0 28px',
      borderBottom:'1px solid var(--y-border)',
      background:'rgba(6,7,13,0.92)',
      backdropFilter:'blur(20px)',
      WebkitBackdropFilter:'blur(20px)',
    }}>
      {/* LOGO */}
      <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, fontWeight:800, fontSize:15, letterSpacing:'-.3px', color:'var(--text)' }}>
        <div style={{
          width:26, height:26, borderRadius:7,
          background:'var(--y)', display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Zap size={14} color="#06070D" fill="#06070D"/>
        </div>
        TrendAI
      </Link>

      {/* CENTER LINKS */}
      <div style={{ display:'flex', gap:2 }}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'5px 13px', borderRadius:7,
            fontSize:12, fontWeight:600,
            color: is(l.to) ? 'var(--y)' : 'var(--text2)',
            background: is(l.to) ? 'var(--y-dim)' : 'transparent',
            transition:'var(--transition)',
          }}>
            {l.icon}{l.label}
          </Link>
        ))}
      </div>

      {/* RIGHT */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* THEME TOGGLE */}
        <button onClick={toggle} aria-label="Toggle theme" style={{
          width:36, height:36, borderRadius:9,
          background:'var(--glass)', border:'1px solid var(--glass-b)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--text2)', transition:'var(--transition)',
        }}>
          {dark ? <Sun size={15}/> : <Moon size={15}/>}
        </button>

        {user ? (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:'50%',
              background:'linear-gradient(135deg,var(--y),#FFB800)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:800, color:'#06070D',
            }}>
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </div>
            <button onClick={handleLogout} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 12px', borderRadius:7,
              background:'transparent', border:'1px solid var(--glass-b)',
              color:'var(--text2)', fontSize:12, fontWeight:600,
              transition:'var(--transition)',
            }}>
              <LogOut size={13}/> Logout
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <Link to="/login" style={{
              padding:'7px 16px', borderRadius:7,
              background:'transparent', border:'1px solid var(--glass-b)',
              color:'var(--text2)', fontSize:12, fontWeight:600,
              transition:'var(--transition)',
            }}>Log in</Link>
            <Link to="/signup" className="btn-primary" style={{ padding:'7px 16px', fontSize:12 }}>
              Get started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}