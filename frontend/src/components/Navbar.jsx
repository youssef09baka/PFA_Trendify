import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Home, LogOut, Search, TrendingUp, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isPath = (path) => location.pathname === path;
  const isExplorer = location.pathname.startsWith('/feed');

  const navigationItems = [
    { to: '/home', label: 'Accueil', icon: <Home size={20} />, active: isPath('/home') },
    { to: '/feed', label: 'Explorer', icon: <TrendingUp size={20} />, active: isExplorer },
    { to: '/search', label: 'Recherche', icon: <Search size={20} />, active: isPath('/search') },
    { to: '/favorites', label: 'Favoris', icon: <Bookmark size={20} />, active: isPath('/favorites') },
    { to: '/profile', label: 'Profil', icon: <UserRound size={20} />, active: isPath('/profile') }
  ];

  if (!user) {
    return (
      <nav className="app-navbar public-navbar">
        <Link className="brand-mark" to="/">
          <img className="brand-logo-img" src="/brand/trendify-logo.png" alt="" />
          <span>Trendify</span>
        </Link>

        <div className="nav-public-actions">
          <Link to="/login" className="btn btn-ghost nav-link">Se connecter</Link>
          <Link to="/signup" className="btn btn-primary nav-link">Commencer</Link>
        </div>
      </nav>
    );
  }

  return (
    <>
      <aside className="app-sidebar" aria-label="Navigation principale">
        <Link className="sidebar-brand" to="/home">
          <img className="brand-logo-img" src="/brand/trendify-logo.png" alt="" />
          <span>Trendify</span>
        </Link>

        <div className="sidebar-nav-list">
          {navigationItems.map((item) => (
            <Link key={item.label} to={item.to} className={item.active ? 'sidebar-nav-item active' : 'sidebar-nav-item'}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-bottom">
          <Link to="/profile" className="sidebar-profile-card">
            <span className="sidebar-profile-avatar">{(user.name || user.email || 'U')[0].toUpperCase()}</span>
            <span>
              <strong>{user.name || 'Profil'}</strong>
              <small>{user.aiRemaining ?? 0} analyses</small>
            </span>
          </Link>

          <Button onClick={handleLogout} variant="ghost" icon={<LogOut size={16} />}>Deconnexion</Button>
        </div>
      </aside>

      <nav className="mobile-topbar">
        <Link className="brand-mark" to="/home">
          <img className="brand-logo-img" src="/brand/trendify-logo.png" alt="" />
          <span>Trendify</span>
        </Link>
        <Link className="mobile-search-button" to="/search" aria-label="Recherche">
          <Search size={18} />
        </Link>
      </nav>

      <nav className="app-dock" aria-label="Navigation mobile">
        {navigationItems.map((item) => (
          <Link key={item.label} to={item.to} className={item.active ? 'dock-item active' : 'dock-item'}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
