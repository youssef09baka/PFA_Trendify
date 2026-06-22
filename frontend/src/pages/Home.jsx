import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Flame, Search, Settings, Sparkles, TrendingUp, UserRound } from 'lucide-react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatScore } from '../utils/ui';

function displaySourceLabel(source) {
  const key = String(source || '').toLowerCase();
  if (key.includes('reddit')) return 'Reddit';
  if (key.includes('google')) return 'Google Trends';
  return source || 'Source inconnue';
}

function HotTrendCard({ trend }) {
  const id = trend?._id || trend?.id;

  return (
    <Link to={id ? `/feed/${id}` : '/feed'} className="home-hot-card">
      <div>
        <span>{displaySourceLabel(trend.source)}</span>
        <h3>{trend.title || 'Tendance detectee'}</h3>
        <p>{trend.category || 'Categorie non renseignee'}</p>
      </div>
      <strong>{formatScore(trend.score)}</strong>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      try {
        const feedResponse = await api.get('/feed', { params: { page: 1, limit: 8 } });

        if (!active) return;

        const feedItems = Array.isArray(feedResponse.data?.items) ? feedResponse.data.items : [];
        setTrends(feedItems);
      } catch {
        if (active) {
          setTrends([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHome();
    return () => {
      active = false;
    };
  }, []);

  const topTrends = useMemo(
    () => [...trends].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 4),
    [trends]
  );

  const preferences = Array.isArray(user?.preferences) ? user.preferences : [];

  return (
    <div className="page-layout">
      <Navbar />
      <main className="product-main home-main">
        <section className="home-hero">
          <div>
            <span className="eyebrow">Accueil</span>
            <h1>Bonjour {user?.name || 'explorateur'}, voici votre veille du moment.</h1>
            <p>
              Trendify rassemble les signaux chauds, vos preferences et vos sauvegardes pour vous donner une vue claire avant d'explorer.
            </p>
          </div>

          <div className="home-hero-actions">
            <Link to="/feed" className="btn btn-primary">
              Explorer les tendances <ArrowRight size={16} />
            </Link>
            <Link to="/search" className="btn btn-ghost">
              Rechercher <Search size={16} />
            </Link>
          </div>
        </section>

        <div className="home-layout-grid">
          <section className="home-panel">
            <div className="home-panel-header">
              <div>
                <span className="eyebrow">Tendances chaudes</span>
                <h2>Les signaux a regarder maintenant</h2>
              </div>
              <Link to="/feed" className="home-panel-link">Tout explorer</Link>
            </div>

            <div className="home-hot-list">
              {loading ? (
                [1, 2, 3, 4].map((item) => <LoadingSkeleton key={item} height="86px" radius={18} />)
              ) : topTrends.length ? (
                topTrends.map((trend) => <HotTrendCard key={trend._id || trend.id || trend.title} trend={trend} />)
              ) : (
                <EmptyState title="Aucune tendance disponible" subtitle="Le flux sera visible des que les donnees seront chargees." />
              )}
            </div>
          </section>

          <aside className="home-panel home-side-panel">
            <div className="home-panel-header">
              <div>
                <span className="eyebrow">Raccourcis</span>
                <h2>Actions rapides</h2>
              </div>
            </div>

            <div className="quick-actions-list">
              <Link to="/feed" className="quick-action-item">
                <TrendingUp size={18} />
                <span>Explorer le feed</span>
              </Link>
              <Link to="/search" className="quick-action-item">
                <Search size={18} />
                <span>Lancer une recherche</span>
              </Link>
              <Link to="/favorites" className="quick-action-item">
                <Bookmark size={18} />
                <span>Voir les favoris</span>
              </Link>
              <Link to="/profile" className="quick-action-item">
                <Settings size={18} />
                <span>Ajuster le profil</span>
              </Link>
            </div>

            <div className="profile-mini-card">
              <div className="profile-avatar"><UserRound size={18} /></div>
              <div>
                <strong>{user?.name || 'Utilisateur'}</strong>
                <p>{preferences.length ? `${preferences.length} preference(s) active(s)` : 'Aucune preference active'}</p>
              </div>
            </div>
          </aside>
        </div>

        <section className="home-strip">
          <Flame size={18} />
          <span>Objectif du jour: detecter un signal utile, l'analyser, puis le sauvegarder.</span>
          <Sparkles size={18} />
        </section>
      </main>
    </div>
  );
}
