import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { ArrowLeft, Bookmark, BookmarkMinus, ExternalLink, Loader2, Tag, Sparkles, Clock, ArrowRight } from 'lucide-react';

function mediaPreview(trend) {
  if (!trend) return null;

  if (trend.video) {
    return (
      <video controls muted poster={trend.thumbnail || trend.image || ''} style={{ width: '100%', borderRadius: 22, maxHeight: 420, objectFit: 'cover' }}>
        <source src={trend.video} type="video/mp4" />
        Votre navigateur ne prend pas en charge la lecture vidéo.
      </video>
    );
  }

  if (trend.image || trend.thumbnail) {
    return (
      <img
        src={trend.image || trend.thumbnail}
        alt={trend.title}
        style={{ width: '100%', borderRadius: 22, maxHeight: 420, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div style={{ width: '100%', minHeight: 260, borderRadius: 22, background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--glass-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
      Aucune illustration disponible
    </div>
  );
}

export default function TrendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Identifiant de tendance manquant.');
      setLoading(false);
      return;
    }

    const fetchTrend = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/feed/${id}`);
        setTrend(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Tendance introuvable.');
        } else {
          setError('Impossible de charger cette tendance. Vérifiez votre connexion.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [id]);

  const handleToggleSave = async () => {
    if (!trend) return;
    setSaving(true);
    setError('');

    try {
      if (trend.isSaved) {
        await api.delete(`/feed/${id}/save`);
        setTrend((prev) => prev ? { ...prev, isSaved: false, savedCount: Math.max((prev.savedCount || 1) - 1, 0) } : prev);
      } else {
        await api.post(`/feed/${id}/save`);
        setTrend((prev) => prev ? { ...prev, isSaved: true, savedCount: (prev.savedCount || 0) + 1 } : prev);
      }
    } catch (err) {
      setError('Impossible de mettre à jour l’état de sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const showLoading = loading && !trend;
  const showError = !loading && !trend;

  return (
    <div className="page-layout" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ paddingTop: 58, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/feed')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--glass-b)', background: 'var(--glass)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
              <ArrowLeft size={14} /> Retour au feed
            </button>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text3)', marginBottom: 4 }}>Detail de la tendance</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--text)' }}>Ouvrir la tendance</h1>
            </div>
          </div>

          {showLoading ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="skeleton" style={{ height: 420, borderRadius: 22 }} />
              <div className="skeleton" style={{ height: 28, width: '45%', borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 18, width: '60%', borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 160, borderRadius: 22 }} />
            </div>
          ) : showError ? (
            <div style={{ padding: 42, borderRadius: 20, background: 'var(--glass)', border: '1px solid var(--glass-b)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{error || 'Impossible de charger la tendance.'}</div>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text3)' }}>Le lien peut être expiré ou cette tendance n’existe plus.</p>
              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/feed')} style={{ padding: '11px 18px', borderRadius: 10, background: 'var(--y)', color: '#06070D', fontWeight: 700, cursor: 'pointer', border: 'none' }}>Retour au feed</button>
                <button onClick={() => window.location.reload()} style={{ padding: '11px 18px', borderRadius: 10, background: 'var(--glass)', color: 'var(--text2)', border: '1px solid var(--glass-b)', cursor: 'pointer' }}>Réessayer</button>
              </div>
            </div>
          ) : (
            trend && (
              <div className="detail-layout">
                <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="panel-card" style={{ borderRadius: 22, overflow: 'hidden' }}>
                    {mediaPreview(trend)}
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,220,80,0.12)', color: 'var(--y)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{trend.source || 'Source inconnue'}</span>
                    <span style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(96,165,250,0.12)', color: 'var(--b)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{trend.category || 'Catégorie'}</span>
                    {trend.tags?.length > 0 && trend.tags.slice(0, 5).map((tag) => (
                      <span key={tag} style={{ padding: '8px 12px', borderRadius: 999, background: 'var(--glass)', border: '1px solid var(--glass-b)', color: 'var(--text2)', fontSize: 11 }}>#{tag}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{trend.title}</h2>
                      <div style={{ display: 'flex', flexWrap:'wrap', gap: 12, color: 'var(--text3)', fontSize: 13 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Mis à jour {trend.updatedAt ? new Date(trend.updatedAt).toLocaleDateString('fr-FR') : '–'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} /> {trend.ml_prediction || 'Prediction IA indisponible'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Tag size={14} /> {trend.savedCount || 0} sauvegardé{trend.savedCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems:'center' }}>
                      {trend.link && (
                        <a href={trend.link} target="_blank" rel="noreferrer" className="btn-outline" style={{ padding: '10px 16px', display:'inline-flex', alignItems:'center', gap: 8 }}>
                          Voir la source<ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={handleToggleSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.75 : 1 }}>
                        {trend.isSaved ? 'Retirer' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="panel-card card-content">
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 10, color: 'var(--text3)' }}>Score</div>
                      <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--y)', fontFamily: 'var(--mono)', marginBottom: 8 }}>{trend.score ?? '–'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{trend.scoreDetails?.summary || 'Score de tendance calculé à partir des signaux disponibles.'}</div>
                    </div>
                    <div className="panel-card card-content">
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 10, color: 'var(--text3)' }}>Analyse IA</div>
                      <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, minHeight: 80, margin:0 }}>{trend.analysis || 'Aucune analyse fournie pour cette tendance.'}</p>
                    </div>
                  </div>

                  <div className="panel-card card-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <Sparkles size={18} color="var(--y)" />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text3)' }}>Idée de contenu</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Utilisez ce signal pour inspirer votre prochain format.</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, margin:0 }}>{trend.idea || 'Aucune idée prédictive disponible pour ce signal.'}</p>
                  </div>
                </section>

                <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 20, padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 12, color: 'var(--text3)' }}>Résumé</div>
                    <div style={{ display: 'grid', gap: 14 }}>
                      {[
                        { label: 'Source', value: trend.source || '–' },
                        { label: 'Catégorie', value: trend.category || '–' },
                        { label: 'Score', value: trend.score !== undefined ? trend.score : '–' },
                        { label: 'Tags', value: trend.tags?.length ? trend.tags.join(', ') : 'Aucun' },
                        { label: 'Média', value: trend.mediaType || 'Aucun' }
                      ].map((item) => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--divider)', paddingBottom: 8, color: 'var(--text2)' }}>
                          <span style={{ fontSize: 12 }}>{item.label}</span>
                          <strong style={{ fontSize: 12, color: 'var(--text)' }}>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {trend.related?.length > 0 && (
                    <div style={{ background: 'var(--glass)', border: '1px solid var(--glass-b)', borderRadius: 20, padding: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 14, color: 'var(--text3)' }}>Tendances liées</div>
                      <div style={{ display: 'grid', gap: 12 }}>
                        {trend.related.map((item) => (
                          <Link key={item.id} to={`/feed/${item.id}`} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', textDecoration: 'none', color: 'var(--text)' }}>
                            <div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--glass)', border: '1px solid var(--glass-b)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {item.thumbnail ? <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Aucun visuel</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text3)' }}>
                                <span>{item.source}</span>
                                <span style={{ fontFamily: 'var(--mono)' }}>{item.score}</span>
                              </div>
                            </div>
                            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--text3)' }} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
