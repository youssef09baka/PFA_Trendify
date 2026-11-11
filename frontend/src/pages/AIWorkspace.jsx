import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { ArrowLeft, Brain, Sparkles, TrendingUp } from 'lucide-react';
import { formatScore } from '../utils/ui';

const MIN_REPORT_LOADING_MS = 2000;

function normalizeList(value, limit = 5) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, limit);
  if (typeof value !== 'string') return [];

  return value
    .split(/\n|;/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function AnalysisThinkingLoader({ title, progress, phase }) {
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
        <h2>{progress >= 100 ? 'Rapport prêt.' : 'Analyse en cours...'}</h2>
        <p>{title ? `Signal analysé : ${title}` : 'Trendi lit les données disponibles pour construire une analyse utile.'}</p>
      </div>

      <div className="thinking-message-card">
        <Sparkles size={17} />
        <span>{phase}</span>
      </div>

      <div className="thinking-progress" aria-label={`Progression réelle ${progress}%`}>
        <div className="thinking-progress-label">
          <span>Sections du rapport générées</span>
          <strong>{progress}%</strong>
        </div>
        <div className="thinking-progress-track">
          <div style={{ width: `${progress}%` }} />
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
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisPhase, setAnalysisPhase] = useState('Préparation de l’analyse…');
  const [reportVisible, setReportVisible] = useState(false);
  const [error, setError] = useState('');
  const loadingStartedAtRef = useRef(0);
  const minimumRevealTimerRef = useRef(null);
  const requestControllerRef = useRef(null);

  const loadWorkspace = useCallback(async () => {
    if (!id) return;

    window.clearTimeout(minimumRevealTimerRef.current);
    requestControllerRef.current?.abort();
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    loadingStartedAtRef.current = Date.now();
    setAnalysisProgress(0);
    setAnalysisPhase('Préparation de l’analyse…');
    setReportVisible(false);
    setAnalysis(null);
    setError('');
    try {
      const apiBaseUrl = String(api.defaults.baseURL || '/api').replace(/\/$/, '');
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/feed/${id}/analyze/stream`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        signal: requestController.signal
      });

      if (!response.ok) {
        if (response.status === 401 && token) {
          localStorage.removeItem('token');
          navigate('/login?expired=1');
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const requestError = new Error(payload.message || 'La génération du rapport a échoué.');
        requestError.response = { status: response.status, data: payload };
        throw requestError;
      }

      if (!response.body) throw new Error('Le flux de progression est indisponible.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      let streamError = null;

      const handleEvent = (block) => {
        const eventName = block.split(/\r?\n/).find((line) => line.startsWith('event:'))?.slice(6).trim();
        const data = block.split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!eventName || !data) return;

        const payload = JSON.parse(data);
        if (eventName === 'progress') {
          setAnalysisProgress(Math.max(0, Math.min(100, Number(payload.progress) || 0)));
          setAnalysisPhase(payload.phase || 'Analyse en cours…');
        } else if (eventName === 'complete') {
          setTrend(payload.trend || null);
          setAnalysis(payload.analysis || null);
          completed = true;
        } else if (eventName === 'error') {
          streamError = new Error(payload.message || 'Le moteur IA est actuellement inaccessible.');
          streamError.response = { status: payload.statusCode, data: payload };
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        blocks.forEach(handleEvent);
        if (streamError || completed || done) break;
      }
      reader.releaseLock();

      if (streamError) throw streamError;
      if (!completed) throw new Error('Le rapport n’a pas été reçu complètement.');

      setAnalysisProgress(100);
      setAnalysisPhase('Rapport vérifié et prêt.');
      const remaining = Math.max(0, MIN_REPORT_LOADING_MS - (Date.now() - loadingStartedAtRef.current));
      await new Promise((resolve) => {
        minimumRevealTimerRef.current = window.setTimeout(resolve, remaining);
      });
      setReportVisible(true);
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
    } finally {
      if (requestControllerRef.current === requestController) requestControllerRef.current = null;
    }
  }, [id, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(minimumRevealTimerRef.current);
      requestControllerRef.current?.abort();
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
              <AnalysisThinkingLoader title={trend?.title} progress={analysisProgress} phase={analysisPhase} />
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
