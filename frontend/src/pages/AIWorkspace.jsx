import { useEffect, useMemo, useState } from 'react';
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

  const loadWorkspace = async () => {
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
  };

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  useEffect(() => {
    if (!analysis) return;
    const stages = [
      analysis.summary || 'Synthèse en cours…',
      analysis.opportunity || 'Opportunité en cours…',
      (analysis.contentIdeas || []).join(' '),
      analysis.marketInterpretation || 'Interprétation en cours…',
      analysis.prediction || 'Prédiction en cours…'
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
      { title: 'Business angles', text: (analysis.businessOpportunities || []).join(' • ') || 'Aucun angle business disponible.' },
      { title: 'Idées de contenu', text: (analysis.contentIdeas || []).join(' • ') || 'Aucune idée de contenu disponible.' },
      { title: 'Potentiel de croissance', text: analysis.growthPotential || analysis.prediction || 'Potentiel de croissance en cours d’évaluation.' },
      { title: 'Interprétation marché', text: analysis.marketInterpretation || 'Aucune interprétation disponible.' },
      { title: 'Prédiction', text: analysis.prediction || 'Aucune prédiction disponible.' },
      { title: 'Confiance', text: `Niveau de confiance : ${analysis.confidence || 'Medium'}` }
    ];
  }, [analysis]);

  return (
    <div className="page-layout" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="detail-page-main ai-workspace-main">
        <div className="detail-page-shell">
          <div className="detail-header">
            <div className="detail-title-group">
              <Button type="button" variant="ghost" className="detail-back" onClick={() => navigate(`/feed/${id}`)} icon={<ArrowLeft size={16} />}>Retour au signal</Button>
              <div className="eyebrow">Workspace d’analyse IA</div>
              <h1>{trend?.title || 'Analyse du signal'}</h1>
              <p className="detail-intro">Un espace de recherche IA orienté opportunité, potentiel de croissance et interprétation marché, directement connecté au signal sélectionné.</p>
            </div>
            <div className="detail-actions">
              <Button type="button" variant="primary" onClick={loadWorkspace} disabled={loading}>Rerun analyse</Button>
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
                    <small style={{ color: 'var(--text3)' }}>Étape active : {stageCards[stageIndex]?.title || 'Synthèse'} · {analysis?.status === 'openrouter' ? 'Analyse OpenRouter' : 'Fallback de secours'}</small>
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
                <div className="summary-row"><span className="summary-label">Catégorie</span><strong>{trend?.category || '—'}</strong></div>
                <div className="summary-row"><span className="summary-label">Score</span><strong>{trend?.score !== undefined ? formatScore(trend.score) : '—'}</strong></div>
                <div className="summary-row"><span className="summary-label">Momentum</span><strong>{trend?.ml_prediction || '—'}</strong></div>
              </div>

              <div className="panel-card card-content" style={{ marginTop: 12, padding: 12, border: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MessageSquareText size={14} color="var(--b)" />
                  <strong style={{ fontSize: 13 }}>Environnement de recherche</strong>
                </div>
                <p style={{ color: 'var(--text3)', lineHeight: 1.6, margin: 0 }}>
                  Ce workspace relie le signal au brief IA et au contexte métier, au lieu d’afficher une page vide ou un widget statique.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
