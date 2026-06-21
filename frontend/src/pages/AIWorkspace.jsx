import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { ArrowLeft } from 'lucide-react';
import { formatScore } from '../utils/ui';

export default function AIWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWorkspace = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError('');
    try {
      const detail = await api.get(`/feed/${id}`);
      setTrend(detail.data || null);

      const { data } = await api.post(`/feed/${id}/analyze`);
      setTrend((prev) => ({ ...(prev || {}), ...(data.trend || {}) }));
      setAnalysis(data.analysis || null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setError(err.response?.data?.message || 'Quota IA atteint. Revenez demain.');
      } else {
        setError('La génération d’analyse IA n’a pas pu démarrer pour ce signal.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);
  const report = useMemo(() => {
    if (!analysis) return null;
    const marketText = analysis.marketAnalysis || analysis.marketInterpretation || analysis.growthPotential || 'Analyse marché indisponible pour ce signal.';
    return {
      summary: analysis.summary || 'Résumé indisponible pour ce signal.',
      whyItMatters: analysis.whyItMatters || analysis.summary || 'Le contexte de cette tendance n’est pas encore disponible.',
      marketAnalysis: marketText,
      opportunity: analysis.opportunity || 'Aucune opportunité spécifique n’a été identifiée.',
      businessOpportunities: (analysis.businessOpportunities || []).filter(Boolean).slice(0, 5),
      contentIdeas: (analysis.contentIdeas || []).filter(Boolean).slice(0, 5)
    };
  }, [analysis]);

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

  return (
    <div className="page-layout" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="detail-page-main ai-workspace-main">
        <div className="detail-page-shell">
          <div className="detail-header ai-report-page-header">
            <div className="detail-title-group">
              <Button type="button" variant="ghost" className="detail-back" onClick={() => navigate(`/feed/${id}`)} icon={<ArrowLeft size={16} />}>Retour au signal</Button>
              <div className="eyebrow">Analyse IA</div>
              <h1>{trend?.title || 'Analyse du signal'}</h1>
            </div>
            <div className="detail-actions">
              <Button type="button" variant="primary" onClick={loadWorkspace} disabled={loading}>Relancer l’analyse</Button>
            </div>
          </div>

          <section className="ai-report-shell">
            {loading ? (
              <div className="ai-report-loading">
                <LoadingSkeleton height="22px" width="38%" radius={8} />
                <LoadingSkeleton height="112px" radius={14} />
                <div className="ai-section-grid">
                  <LoadingSkeleton height="170px" radius={14} />
                  <LoadingSkeleton height="170px" radius={14} />
                </div>
                <LoadingSkeleton height="140px" radius={14} />
              </div>
            ) : error ? (
              <EmptyState title="Analyse indisponible" subtitle={error} action={<Button variant="ghost" onClick={() => navigate('/feed')}>Retour au flux</Button>} />
            ) : report ? (
              <div className="ai-report">
                <div className="ai-report-titlebar">
                  <div>
                    <small>Rapport d’analyse IA</small>
                    <h2>{trend?.title || 'Signal analysé'}</h2>
                  </div>
                  <div className="ai-report-meta" aria-label="Contexte du signal">
                    <span>{trend?.source || 'Source inconnue'}</span>
                    <span>{trend?.score !== undefined ? formatScore(trend.score) : 'Score indisponible'}</span>
                    {trend?.ml_prediction ? (
                      <span style={getPredictionBadgeStyle(trend.ml_prediction)}>{trend.ml_prediction === 'HIGH' ? 'Potentiel fort' : trend.ml_prediction === 'LOW' ? 'Potentiel faible' : 'Momentum indisponible'}</span>
                    ) : (
                      <span>Momentum indisponible</span>
                    )}
                  </div>
                </div>

                <article className="ai-executive-summary">
                  <small>Résumé exécutif</small>
                  <p>{report.summary}</p>
                </article>

                <div className="ai-section-grid">
                  <article className="ai-insight-card">
                    <h3>Pourquoi cette tendance est importante</h3>
                    <p>{report.whyItMatters}</p>
                  </article>
                  <article className="ai-insight-card">
                    <h3>Analyse marché</h3>
                    <p>{report.marketAnalysis}</p>
                  </article>
                </div>

                <article className="ai-opportunity-focus">
                  <small>Opportunité identifiée</small>
                  <p>{report.opportunity}</p>
                </article>

                <section className="ai-report-block">
                  <div className="ai-block-heading">
                    <small>Opportunités business</small>
                    <h3>Actions prioritaires</h3>
                  </div>
                  {report.businessOpportunities.length ? (
                    <div className="ai-business-grid">
                      {report.businessOpportunities.map((item, index) => (
                        <article className="ai-business-card" key={item}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <p>{item}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="ai-muted-copy">Aucune opportunité exploitable disponible.</p>
                  )}
                </section>

                <section className="ai-report-block">
                  <div className="ai-block-heading">
                    <small>Idées de contenu</small>
                    <h3>Angles exploitables</h3>
                  </div>
                  {report.contentIdeas.length ? (
                    <ol className="ai-content-list">
                      {report.contentIdeas.map((item, index) => (
                        <li key={item}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <p>{item}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="ai-muted-copy">Aucune idée de contenu exploitable disponible.</p>
                  )}
                </section>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
