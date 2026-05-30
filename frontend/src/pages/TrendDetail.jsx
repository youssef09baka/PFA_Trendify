import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { ArrowLeft, ExternalLink, Sparkles, Clock, ArrowRight } from 'lucide-react';
import MediaBox from '../components/MediaBox';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { formatScore } from '../utils/ui';
import { getCardMediaUrl } from '../utils/media';


export default function TrendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(!id);
  const [error, setError] = useState(() => id ? '' : 'Identifiant de tendance manquant.');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    if (!trend) return '';
    return trend.summary || trend.description || trend.analysis || 'Signal important détecté par le flux de veille.';
  }, [trend]);

  const getPredictionBadgeStyle = (value) => {
    switch (value) {
      case 'HIGH':
        return { background: 'rgba(22, 163, 74, 0.12)', color: '#166534' };
      case 'LOW':
        return { background: 'rgba(239, 68, 68, 0.12)', color: '#991b1b' };
      case 'UNAVAILABLE':
        return { background: 'rgba(148, 163, 184, 0.12)', color: '#334155' };
      default:
        return { background: 'rgba(148, 163, 184, 0.12)', color: '#334155' };
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchTrend = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/feed/${id}`);
        setTrend(data);
      } catch (error) {
        if (error.response?.status === 404) {
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
    } catch {
      setError('Impossible de mettre à jour l’état de sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const showLoading = loading && !trend;
  const showError = !loading && !trend;

  const detailList = useMemo(() => {
    if (!trend) return [];
    return [
      { label: 'Source', value: trend.source || '–' },
      { label: 'Catégorie', value: trend.category || '–' },
      { label: 'Score', value: trend.score !== undefined ? formatScore(trend.score) : '–' },
      { label: 'Tags', value: trend.tags?.length ? trend.tags.join(', ') : 'Aucun' },
      { label: 'Média', value: trend.mediaType || 'Aucun' },
    ];
  }, [trend]);

  return (
    <div className="page-layout" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="detail-page-main">
        <div className="detail-page-shell">
          <div className="detail-header">
            <div className="detail-title-group">
              <Button type="button" variant="ghost" className="detail-back" onClick={() => navigate('/feed')} icon={<ArrowLeft size={16} />}>Retour au feed</Button>
              <div className="eyebrow">Signal de recherche</div>
              <h1>{trend?.title || 'Chargement du signal...'}</h1>
              <p className="detail-intro">{summary}</p>
            </div>

            <div className="detail-actions">
              {trend?.link && (
                <Button
                  href={trend.link}
                  variant="ghost"
                  target="_blank"
                  rel="noreferrer"
                  className="detail-source-link"
                  icon={<ExternalLink size={14} />}
                >
                  Voir la source
                </Button>
              )}
              <Button type="button" variant="primary" onClick={() => navigate(`/ai/${trend?._id || trend?.id}`)} disabled={!trend}>
                Faire analyser avec l’IA
              </Button>
              <Button type="button" variant="ghost" onClick={handleToggleSave} disabled={saving} style={{ opacity: saving ? 0.8 : 1 }}>
                {trend?.isSaved ? 'Retirer' : 'Sauvegarder'}
              </Button>
            </div>
          </div>

          {showLoading ? (
            <div className="detail-loading-grid">
              <LoadingSkeleton height="420px" radius={22} />
              <LoadingSkeleton height="28px" width="45%" radius={12} />
              <LoadingSkeleton height="18px" width="60%" radius={12} />
              <LoadingSkeleton height="160px" radius={22} />
            </div>
          ) : showError ? (
            <EmptyState
              title={error || 'Impossible de charger la tendance.'}
              subtitle="Le lien peut être expiré ou cette tendance n’existe plus."
              action={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button variant="primary" onClick={() => navigate('/feed')}>Retour au feed</Button>
                  <Button variant="ghost" onClick={() => window.location.reload()}>Réessayer</Button>
                </div>
              }
            />
          ) : (
            trend && (
              <div className="detail-layout">
                <section className="detail-main">
                  <div className="panel-card panel-media">
                    <MediaBox key={`${trend._id || trend.id || 'detail'}:${getCardMediaUrl(trend) || 'none'}`} video={trend.video} src={getCardMediaUrl(trend)} poster={getCardMediaUrl(trend)} alt={trend.title} aspect="16:9" controls={!!trend.video} />
                  </div>

                  <div className="signal-pill-row">
                    <span className="signal-pill signal-pill--primary">{trend.source || 'Source inconnue'}</span>
                    <span className="signal-pill signal-pill--secondary">{trend.category || 'Catégorie'}</span>
                    {trend.tags?.slice(0, 5).map((tag) => (
                      <span key={tag} className="signal-pill signal-pill--tag">#{tag}</span>
                    ))}
                  </div>

                  <div className="signal-highlights">
                    <div className="mini-card">
                      <small>Impact</small>
                      <strong>{formatScore(trend.score)}</strong>
                      <p>{trend.scoreDetails?.summary || 'Score de tendance calculé à partir des signaux disponibles.'}</p>
                    </div>
                    <div className="mini-card">
                      <small>Momentum</small>
                      {trend.ml_prediction ? (
                        <span className="signal-pill" style={getPredictionBadgeStyle(trend.ml_prediction)}>
                          {trend.ml_prediction === 'HIGH' ? '🔥 HIGH POTENTIAL' : trend.ml_prediction === 'LOW' ? '📉 LOW POTENTIAL' : 'Prediction unavailable'}
                        </span>
                      ) : trend.source === 'Google Trends' ? (
                        <strong>Prédiction ML indisponible pour cette source.</strong>
                      ) : (
                        <strong>Flux en cours</strong>
                      )}
                      <p>{trend.updatedAt ? `Mis à jour le ${new Date(trend.updatedAt).toLocaleDateString('fr-FR')}` : 'Dernière mise à jour indisponible.'}</p>
                    </div>
                    <div className="mini-card">
                      <small>Enregistrement</small>
                      <strong>{trend.savedCount || 0}</strong>
                      <p>{trend.savedCount ? `${trend.savedCount} sauvegarde${trend.savedCount > 1 ? 's' : ''}` : 'Aucun enregistrement encore.'}</p>
                    </div>
                  </div>

                  <div className="panel-card card-content">
                    <div className="section-heading">
                      <div>
                        <small>Contexte signal</small>
                        <h2>Pourquoi ce signal mérite votre attention</h2>
                      </div>
                    </div>
                    <p>{summary}</p>

                    <div className="signal-bullets">
                      <div className="signal-bullet">
                        <div className="signal-bullet-mark">1</div>
                        <div>
                          <strong>Origine du signal</strong>
                          <p>{trend.source ? `Détecté via ${trend.source}` : 'Source inconnue ou indirecte.'}</p>
                        </div>
                      </div>
                      <div className="signal-bullet">
                        <div className="signal-bullet-mark">2</div>
                        <div>
                          <strong>Contexte actuel</strong>
                          <p>{trend.category ? `${trend.category} est en phase de progression.` : 'Contexte de catégorie indisponible.'}</p>
                        </div>
                      </div>
                      <div className="signal-bullet">
                        <div className="signal-bullet-mark">3</div>
                        <div>
                          <strong>Comment l’utiliser</strong>
                          <p>{trend.tags?.length ? `Intégrez ce signal dans les briefs liés à ${trend.tags.slice(0, 2).join(', ')}.` : 'Utilisez ce signal comme base de recherche.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {trend.idea && (
                    <div className="panel-card card-content">
                      <div className="section-heading">
                        <div>
                          <small>Inspiration</small>
                          <h2>Idée de contenu</h2>
                        </div>
                      </div>
                      <p>{trend.idea}</p>
                    </div>
                  )}
                </section>

                <aside className="detail-sidebar">
                  <div className="panel-card card-content ai-panel">
                    <div className="section-heading">
                      <div>
                        <small>Analyse IA</small>
                        <h3>Espace dédié</h3>
                      </div>
                    </div>
                    <p>Le widget statique est remplacé par un espace de recherche IA dédié au signal sélectionné.</p>
                    <Button type="button" variant="primary" onClick={() => navigate(`/ai/${trend?._id || trend?.id}`)}>
                      Ouvrir l’espace d’analyse
                    </Button>
                  </div>

                  <div className="panel-card card-content detail-summary-card">
                    <div className="section-heading">
                      <div>
                        <small>Fiche rapide</small>
                        <h3>Statuts clés</h3>
                      </div>
                    </div>
                    <div className="summary-list">
                      {detailList.map((item) => (
                        <div key={item.label} className="summary-row">
                          <span className="summary-label">{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {trend.related?.length > 0 && (
                    <div className="panel-card card-content">
                      <div className="section-heading">
                        <div>
                          <small>Signal adjacent</small>
                          <h3>Tendances liées</h3>
                        </div>
                      </div>
                      <div className="related-list">
                        {trend.related.map((item) => (
                          <Link key={item.id} to={`/feed/${item.id}`} className="related-card">
                            <div className="related-thumb">
                              {getCardMediaUrl(item) ? (
                                <MediaBox key={`${item.id || item._id || 'related'}:${getCardMediaUrl(item) || 'none'}`} src={getCardMediaUrl(item)} alt={item.title} aspect="square" />
                              ) : (
                                <span className="related-thumb-label">Signal</span>
                              )}
                            </div>
                            <div className="related-card-copy">
                              <div className="related-card-title">{item.title}</div>
                              <div className="related-card-meta">
                                <span>{item.source}</span>
                                <span>{formatScore(item.score)}</span>
                              </div>
                            </div>
                            <ArrowRight size={14} style={{ color: 'var(--text3)' }} />
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
