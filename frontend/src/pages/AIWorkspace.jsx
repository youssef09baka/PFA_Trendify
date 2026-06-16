import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { ArrowLeft, Sparkles, TrendingUp, Brain, MessageSquareText } from 'lucide-react';
import { formatScore } from '../utils/ui';

export default function AIWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiRemaining, setAiRemaining] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

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
      setAiRemaining(typeof data.aiRemaining === 'number' ? data.aiRemaining : 0);
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

  useEffect(() => {
    // Debug logs requested for runtime verification
    console.log('analysis', analysis);
    console.log('trend', trend);
    console.log('ML_PREDICTION_RAW =', trend?.ml_prediction);
  }, [analysis, trend]);

  useEffect(() => {
    if (!analysis) return;
    const stages = [
      analysis.summary || 'Synthèse en cours…',
      analysis.opportunity || 'Opportunité en cours…',
      (analysis.contentIdeas || []).join(' '),
      analysis.marketInterpretation || 'Interprétation en cours…'
    ].filter(Boolean);

    if (!stages.length) return;

    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length);
    }, 1600);

    return () => clearInterval(timer);
  }, [analysis]);

  const stageCards = useMemo(() => {
    if (!analysis) return [];
    return [
      { title: 'Synthèse', text: analysis.summary || 'Synthèse en cours…' },
      { title: 'Pourquoi ça compte', text: analysis.whyItMatters || analysis.summary || 'Le contexte de ce signal est en cours d’analyse.' },
      { title: 'Opportunité', text: analysis.opportunity || 'Aucune opportunité détaillée.' },
      { title: 'Pistes business', text: (analysis.businessOpportunities || []).join(' • ') || 'Aucune piste business disponible.' },
      { title: 'Idées de contenu', text: (analysis.contentIdeas || []).join(' • ') || 'Aucune idée de contenu disponible.' },
      { title: 'Potentiel de croissance', text: analysis.growthPotential || 'Potentiel de croissance en cours d’évaluation.' },
      { title: 'Interprétation marché', text: analysis.marketInterpretation || 'Aucune interprétation disponible.' },
      { title: 'Prédiction ML', text: (() => {
        const v = trend?.ml_prediction;
        if (!v) {
          if (trend?.source === 'Google Trends') {
            return 'Prédiction ML indisponible pour cette source.';
          }
          return 'Prédiction ML en cours…';
        }
        if (v === 'HIGH') return '🔥 HIGH POTENTIAL\nLe modèle Random Forest estime un fort potentiel de traction.';
        if (v === 'LOW') return '📉 LOW POTENTIAL\nLe modèle Random Forest estime un potentiel limité.';
        return 'Prédiction indisponible. Le modèle n’a pas pu produire de résultat.';
      })() },
      { title: 'Confiance', text: `Niveau de confiance : ${analysis.confidence || 'Moyenne'}` }
    ];
  }, [analysis, trend?.ml_prediction, trend?.source]);

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
          <div className="detail-header">
            <div className="detail-title-group">
              <Button type="button" variant="ghost" className="detail-back" onClick={() => navigate(`/feed/${id}`)} icon={<ArrowLeft size={16} />}>Retour au signal</Button>
              <div className="eyebrow">Espace d’analyse IA</div>
              <h1>{trend?.title || 'Analyse du signal'}</h1>
              <p className="detail-intro">Un espace de recherche IA orienté opportunité, potentiel de croissance et interprétation marché, directement connecté au signal sélectionné.</p>
            </div>
            <div className="detail-actions">
              <Button type="button" variant="primary" onClick={loadWorkspace} disabled={loading}>Relancer l’analyse</Button>
            </div>
          </div>

          <div className="ai-workspace-grid">
            <section className="panel-card card-content">
              <div className="section-heading">
                <div>
                  <small>Traitement en cours</small>
                  <h2>Analyse de tendance</h2>
                </div>
                <span className="signal-pill signal-pill--primary">{aiRemaining} restant{aiRemaining > 1 ? 's' : ''}</span>
              </div>

              {loading ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <LoadingSkeleton height="18px" width="60%" radius={10} />
                  <LoadingSkeleton height="90px" radius={18} />
                  <LoadingSkeleton height="18px" width="80%" radius={10} />
                </div>
              ) : error ? (
                <EmptyState title="Analyse indisponible" subtitle={error} action={<Button variant="ghost" onClick={() => navigate('/feed')}>Retour au flux</Button>} />
              ) : (
                <>
                  <div className="ai-stage-card" style={{ borderColor: analysis?.status === 'openrouter' ? 'rgba(124, 58, 237, 0.35)' : 'rgba(255, 179, 71, 0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Brain size={16} color="var(--y)" />
                      <strong>Brief IA</strong>
                    </div>
                    <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
                      {stageCards[stageIndex]?.text || 'Analyse prête.'}
                    </p>
                    <small style={{ color: 'var(--text3)' }}>Étape active : {stageCards[stageIndex]?.title || 'Synthèse'} · {analysis?.status === 'openrouter' ? 'Analyse IA OpenRouter' : 'Mode de secours'}</small>
                  </div>

                  <div className="ai-grid-cards">
                    {stageCards.map((item, index) => (
                      <article key={item.title} className={`ai-mini-card ${index === stageIndex ? 'active' : ''}`}>
                        <small>{item.title}</small>
                        <p>{item.text}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>

            <aside className="panel-card card-content">
              <div className="section-heading">
                <div>
                  <small>Contexte</small>
                  <h3>Signal en cours</h3>
                </div>
                <TrendingUp size={16} color="var(--y)" />
              </div>

              <div className="summary-list">
                <div className="summary-row"><span className="summary-label">Titre</span><strong>{trend?.title || '—'}</strong></div>
                <div className="summary-row"><span className="summary-label">Source</span><strong>{trend?.source || '—'}</strong></div>

                <div className="summary-row"><span className="summary-label">Score</span><strong>{trend?.score !== undefined ? formatScore(trend.score) : '—'}</strong></div>
                <div className="summary-row">
                  <span className="summary-label">Momentum</span>
                  {trend?.ml_prediction ? (
                    <span className="signal-pill" style={getPredictionBadgeStyle(trend.ml_prediction)}>{trend.ml_prediction === 'HIGH' ? '🔥 HIGH POTENTIAL' : trend.ml_prediction === 'LOW' ? '📉 LOW POTENTIAL' : 'Prediction unavailable'}</span>
                  ) : trend?.source === 'Google Trends' ? (
                    <strong>Prédiction ML indisponible pour cette source.</strong>
                  ) : (
                    <strong>—</strong>
                  )}
                </div>
              </div>

              {trend?.ml_prediction && (
                <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--divider)', borderRadius: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <small style={{ color: 'var(--text3)' }}>Prédiction ML</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <strong style={{ fontSize: 14 }}>{trend.ml_prediction === 'HIGH' ? '🔥 HIGH POTENTIAL' : trend.ml_prediction === 'LOW' ? '📉 LOW POTENTIAL' : 'Prediction unavailable'}</strong>
                    </div>
                    <div style={{ color: 'var(--text3)', marginTop: 8 }}>
                      {trend.ml_prediction === 'HIGH' ? 'Le modèle Random Forest estime un fort potentiel de traction.' : trend.ml_prediction === 'LOW' ? 'Le modèle Random Forest estime un potentiel limité.' : 'Le modèle Random Forest n’a pas pu produire de prédiction.'}
                    </div>
                    <div style={{ marginTop: 8, color: 'var(--text3)' }}><strong>Modèle :</strong> Random Forest</div>
                  </div>

                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--divider)', color: 'var(--text3)' }}>
                    <small>Confiance IA</small>
                    <div style={{ marginTop: 6 }}>{analysis?.confidence || 'Moyenne'}</div>
                  </div>
                </div>
              )}

              <div className="panel-card card-content" style={{ marginTop: 12, padding: 12, border: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MessageSquareText size={14} color="var(--b)" />
                  <strong style={{ fontSize: 13 }}>Environnement de recherche</strong>
                </div>
                <p style={{ color: 'var(--text3)', lineHeight: 1.6, margin: 0 }}>
                  Cet espace relie le signal au brief IA et au contexte métier, au lieu d’afficher une page vide ou un widget statique.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
