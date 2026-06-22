import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { ArrowLeft, Brain, Sparkles, TrendingUp } from 'lucide-react';
import { formatScore } from '../utils/ui';

const thinkingSteps = [
  'Analyse des signaux Reddit...',
  'Évaluation du potentiel de croissance...',
  'Recherche des opportunités cachées...',
  'Croisement avec les tendances mondiales...',
  'Génération d’idées business...',
  'Identification des signaux les plus pertinents...',
  'Construction du rapport stratégique...',
  'Finalisation de l’analyse...'
];

const MIN_REPORT_LOADING_MS = 5500;

function normalizeList(value, limit = 5) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, limit);
  if (typeof value !== 'string') return [];

  return value
    .split(/\n|;/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function AnalysisThinkingLoader({ title, complete, onReady }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(18);
  const completionNotifiedRef = useRef(false);

  useEffect(() => {
    if (complete) {
      return undefined;
    }

    const stepTimer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % thinkingSteps.length);
    }, 2400);

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return current;
        const next = current + Math.floor(Math.random() * 8) + 3;
        return Math.min(next, 88);
      });
    }, 900);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
    };
  }, [complete]);

  const displayedProgress = complete ? 100 : progress;
  const displayedStepIndex = complete ? thinkingSteps.length - 1 : stepIndex;

  useEffect(() => {
    if (!complete) {
      completionNotifiedRef.current = false;
      return undefined;
    }

    const revealTimer = window.setTimeout(() => {
      if (completionNotifiedRef.current) return;
      completionNotifiedRef.current = true;
      onReady?.();
    }, 850);

    return () => window.clearTimeout(revealTimer);
  }, [complete, onReady]);

  const handleProgressTransitionEnd = (event) => {
    if (!complete || event.propertyName !== 'width' || completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    onReady?.();
  };

  return (
    <div className="analysis-thinking-loader" role="status" aria-live="polite">
      <div className="thinking-orb-wrap">
        <div className="thinking-orb">
          <TrendingUp size={28} />
        </div>
        <span className="thinking-pulse thinking-pulse-one" />
        <span className="thinking-pulse thinking-pulse-two" />
      </div>

      <div className="thinking-copy">
        <span className="thinking-kicker">
          <Brain size={15} />
          Trendi prépare le rapport
        </span>
        <h2>{complete ? 'Rapport prêt.' : 'Analyse en cours...'}</h2>
        <p>{title ? `Signal analysé : ${title}` : 'Trendi lit les données disponibles pour construire une analyse utile.'}</p>
      </div>

      <div className="thinking-message-card">
        <Sparkles size={17} />
        <span key={displayedStepIndex}>{thinkingSteps[displayedStepIndex]}</span>
      </div>

      <div className="thinking-progress" aria-label={`Progression estimée ${displayedProgress}%`}>
        <div className="thinking-progress-label">
          <span>Construction du rapport stratégique</span>
          <strong>{displayedProgress}%</strong>
        </div>
        <div className="thinking-progress-track">
          <div style={{ width: `${displayedProgress}%` }} onTransitionEnd={handleProgressTransitionEnd} />
        </div>
      </div>
    </div>
  );
}

export default function AIWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [error, setError] = useState('');
  const loadingStartedAtRef = useRef(0);
  const minimumRevealTimerRef = useRef(null);

  const loadWorkspace = useCallback(async () => {
    if (!id) return;

    window.clearTimeout(minimumRevealTimerRef.current);
    loadingStartedAtRef.current = Date.now();
    setAnalysisComplete(false);
    setReportVisible(false);
    setAnalysis(null);
    setError('');
    try {
      const detail = await api.get(`/feed/${id}`);
      setTrend(detail.data || null);

      const { data } = await api.post(`/feed/${id}/analyze`);
      setTrend((prev) => ({ ...(prev || {}), ...(data.trend || {}) }));
      setAnalysis(data.analysis || null);
      const elapsed = Date.now() - loadingStartedAtRef.current;
      const remaining = Math.max(0, MIN_REPORT_LOADING_MS - elapsed);
      minimumRevealTimerRef.current = window.setTimeout(() => {
        setAnalysisComplete(true);
      }, remaining);
    } catch (err) {
      window.clearTimeout(minimumRevealTimerRef.current);
      const status = err?.response?.status;
      const errorStatus = err?.response?.data?.status;
      if (errorStatus === 'ai_unavailable') {
        setError('Le moteur IA est actuellement inaccessible. Veuillez réessayer ultérieurement.');
      } else if (status === 429) {
        setError(err.response?.data?.message || 'Quota IA atteint. Revenez demain.');
      } else {
        setError('La génération d’analyse IA n’a pas pu démarrer pour ce signal.');
      }
    }
  }, [id]);

  const handleReportReady = useCallback(() => {
    setReportVisible(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(minimumRevealTimerRef.current);
    };
  }, [loadWorkspace]);

  const report = useMemo(() => {
    if (!analysis) return null;

    const marketText = analysis.marketAnalysis || '';
    const confidence = analysis.confidence || '';
    const confidenceReason = analysis.confidenceReason || '';
    const businessOpportunities = (analysis.businessOpportunities || []).filter(Boolean).slice(0, 5);
    const contentIdeas = (analysis.contentIdeas || []).filter(Boolean).slice(0, 5);
    const risks = normalizeList(analysis.risks, 4);
    const recommendations = normalizeList(analysis.recommendations, 4);

    return {
      summary: analysis.summary || '',
      whyTrendRises: analysis.whyTrendRises || '',
      targetAudience: analysis.targetAudience || '',
      marketAnalysis: marketText,
      opportunity: analysis.opportunity || '',
      risks,
      confidence,
      confidenceReason,
      recommendations,
      businessOpportunities,
      contentIdeas,
      conclusion: analysis.conclusion || ''
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

  const generating = !error && !reportVisible;

  return (
    <div className="page-layout" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="detail-page-main ai-workspace-main">
        <div className="detail-page-shell">
          <div className="detail-header ai-report-page-header">
            <div className="detail-title-group">
              <Button type="button" variant="ghost" className="detail-back" onClick={() => navigate(`/feed/${id}`)} icon={<ArrowLeft size={16} />}>Retour au signal</Button>
              <div className="eyebrow">Rapport stratégique</div>
              <h1>{trend?.title || 'Analyse du signal'}</h1>
            </div>
            <div className="detail-actions">
              <Button type="button" variant="primary" onClick={loadWorkspace} disabled={generating}>Relancer le rapport</Button>
            </div>
          </div>

          <section className="ai-report-shell">
            {generating ? (
              <AnalysisThinkingLoader title={trend?.title} complete={analysisComplete} onReady={handleReportReady} />
            ) : error ? (
              <EmptyState title="Analyse indisponible" subtitle={error} action={<Button variant="ghost" onClick={() => navigate('/feed')}>Retour au flux</Button>} />
            ) : report ? (
              <div className="ai-report">
                <div className="ai-report-titlebar">
                  <div>
                    <small>Rapport d’analyse</small>
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
                    <h3>Pourquoi cette tendance monte</h3>
                    <p>{report.whyTrendRises}</p>
                  </article>
                  <article className="ai-insight-card">
                    <h3>Public cible concerné</h3>
                    <p>{report.targetAudience}</p>
                  </article>
                </div>

                <article className="ai-opportunity-focus">
                  <small>Opportunité business</small>
                  <p>{report.opportunity}</p>
                </article>

                <div className="ai-section-grid">
                  <article className="ai-list-card">
                    <h3>Risques</h3>
                    <ul>
                      {report.risks.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                  <article className="ai-confidence-card">
                    <small>Niveau de confiance</small>
                    <strong>{report.confidence}</strong>
                    <p>{report.confidenceReason}</p>
                  </article>
                </div>

                <section className="ai-report-block">
                  <div className="ai-block-heading">
                    <small>Recommandations</small>
                    <h3>Prochaines actions</h3>
                  </div>
                  <ol className="ai-recommendation-list">
                    {report.recommendations.map((item, index) => (
                      <li key={item}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <p>{item}</p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="ai-report-block">
                  <div className="ai-block-heading">
                    <small>Idées business</small>
                    <h3>Opportunités exploitables</h3>
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

                <article className="ai-conclusion-card">
                  <small>Conclusion stratégique</small>
                  <p>{report.conclusion}</p>
                </article>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
