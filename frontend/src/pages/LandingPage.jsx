import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowRight, BarChart3, Bookmark, CheckCircle2, Compass, Sparkles, TrendingUp } from 'lucide-react';

const previewCards = [
  { source: 'Reddit', title: 'Nouvelle vague de jeux communautaires', score: 84, category: 'Gaming' },
  { source: 'Google Trends', title: 'Recherche santé préventive et suivi personnel', score: 78, category: 'Santé' },
  { source: 'Reddit', title: 'Outils business pour micro-équipes', score: 73, category: 'Business' }
];

export default function LandingPage() {
  return (
    <div className="marketing-page">
      <Navbar />

      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <span className="product-kicker">Plateforme de veille stratégique</span>
            <h1>Repérez les tendances qui méritent vraiment votre attention.</h1>
            <p>
              Trendify transforme les signaux Reddit et Google Trends en un flux clair,
              priorisé et exploitable pour décider plus vite.
            </p>
            <div className="hero-actions">
              <Link to="/signup" className="btn btn-primary">
                Commencer <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn btn-ghost">Se connecter</Link>
            </div>
          </div>

          <div className="hero-product-frame" aria-label="Aperçu du produit">
            <div className="hero-phone">
              <div className="hero-phone-header">
                <span>Flux du jour</span>
                <strong>3 signaux forts</strong>
              </div>
              <div className="hero-card-stack">
                {previewCards.map((item) => (
                  <article key={item.title} className="hero-trend-card">
                    <div>
                      <span>{item.source}</span>
                      <h2>{item.title}</h2>
                      <p>{item.category}</p>
                    </div>
                    <strong>{item.score}</strong>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-section">
          <div className="section-title">
            <span>Pourquoi ça marche</span>
            <h2>Une expérience pensée pour lire, comparer et agir.</h2>
          </div>
          <div className="feature-grid">
            <article>
              <Compass size={22} />
              <h3>Flux personnalisé</h3>
              <p>Les préférences filtrent les catégories visibles pour garder un feed utile.</p>
            </article>
            <article>
              <TrendingUp size={22} />
              <h3>Scores lisibles</h3>
              <p>Le score reste simple à comprendre et met les meilleurs signaux en avant.</p>
            </article>
            <article>
              <BarChart3 size={22} />
              <h3>Rapports propres</h3>
              <p>Chaque tendance peut devenir un rapport structuré avec opportunités et idées.</p>
            </article>
            <article>
              <Bookmark size={22} />
              <h3>Sauvegarde rapide</h3>
              <p>Les tendances importantes restent accessibles pour la préparation de contenu.</p>
            </article>
          </div>
        </section>

        <section className="marketing-cta">
          <div>
            <Sparkles size={22} />
            <h2>Prêt à explorer les signaux du moment ?</h2>
            <p>Créez votre compte, choisissez vos domaines, puis ouvrez votre flux.</p>
          </div>
          <Link to="/signup" className="btn btn-primary">
            Lancer le produit <CheckCircle2 size={16} />
          </Link>
        </section>
      </main>
    </div>
  );
}
