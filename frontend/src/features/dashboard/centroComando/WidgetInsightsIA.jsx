/**
 * Insights IA — Cérebro Operacional no grid.
 * Alinhado ao padrão explanation_layer (transparência a um clique).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../../../services/api';
import { Brain, Info } from 'lucide-react';
import DataLineageBlock from '../../../components/DataLineageBlock';

function uncertaintyPhrase(layer) {
  if (!layer || typeof layer.confidence_score !== 'number' || layer.confidence_score >= 60) return null;
  const motivo =
    (Array.isArray(layer.limitations) && layer.limitations.length && layer.limitations.join('; ')) ||
    'dados limitados ou confiança abaixo do limiar interno.';
  return `Esta recomendação possui alto grau de incerteza devido a ${motivo}`;
}

function Skeleton() {
  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header"><div className="cc-alertas__skeleton" /></div>
      <ul className="cc-alertas__list">
        {[1, 2, 3].map((i) => (
          <li key={i} className="cc-alertas__skeleton-item" />
        ))}
      </ul>
    </div>
  );
}

export default function WidgetInsightsIA() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [explainFor, setExplainFor] = useState(null);

  const closeExpl = useCallback(() => setExplainFor(null), []);

  useEffect(() => {
    dashboard.operationalBrain?.getInsights?.({ limit: 6 })
      .then((r) => {
        const raw = r?.data?.insights ?? [];
        setItems(Array.isArray(raw) ? raw.slice(0, 6) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-alertas cc-widget--error">
        <div className="cc-alertas__header"><Brain size={20} /> Insights IA</div>
        <p className="cc-widget__empty">Insights indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header">
        <Brain size={20} />
        <span>Insights IA</span>
      </div>
      {explainFor && (
        <div
          className="cc-insights-expl-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cc-insights-expl-title"
          onClick={closeExpl}
        >
          <div className="cc-insights-expl-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cc-insights-expl-head">
              <div className="cc-insights-expl-title-row">
                <Info size={18} className="cc-insights-expl-icon" aria-hidden />
                <div>
                  <div id="cc-insights-expl-title" className="cc-insights-expl-h">Fundamentos do insight</div>
                  <div className="cc-insights-expl-sub">
                    {explainFor.title || explainFor.titulo || explainFor.message || 'Insight'}
                  </div>
                </div>
              </div>
              <button type="button" className="cc-insights-expl-close" onClick={closeExpl} aria-label="Fechar">×</button>
            </div>
            {explainFor.explanation_layer && (
              <div className="cc-insights-expl-body">
                {typeof explainFor.explanation_layer.confidence_score === 'number' && (
                  <div className="cc-insights-expl-block">
                    <div className="cc-insights-expl-label">Confiança (0–100)</div>
                    <div className="cc-insights-expl-strong">{explainFor.explanation_layer.confidence_score}</div>
                  </div>
                )}
                {explainFor.explanation_layer.source && (
                  <div className="cc-insights-expl-block">
                    <div className="cc-insights-expl-label">Origem</div>
                    <div className="cc-insights-expl-meta">
                      {explainFor.explanation_layer.source === 'model_assisted'
                        ? 'Assistido por modelo (validar factos)'
                        : 'Motor de padrões (determinístico)'}
                    </div>
                  </div>
                )}
                <DataLineageBlock items={explainFor.explanation_layer.data_lineage} />
                {Array.isArray(explainFor.explanation_layer.facts_used) &&
                  explainFor.explanation_layer.facts_used.length > 0 && (
                    <div className="cc-insights-expl-block">
                      <div className="cc-insights-expl-label">Factos utilizados</div>
                      <ul className="cc-insights-expl-ul">
                        {explainFor.explanation_layer.facts_used.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(explainFor.explanation_layer.business_rules) &&
                  explainFor.explanation_layer.business_rules.length > 0 && (
                    <div className="cc-insights-expl-block">
                      <div className="cc-insights-expl-label">Diretrizes</div>
                      <ul className="cc-insights-expl-ul">
                        {explainFor.explanation_layer.business_rules.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(explainFor.explanation_layer.limitations) &&
                  explainFor.explanation_layer.limitations.length > 0 && (
                    <div className="cc-insights-expl-block">
                      <div className="cc-insights-expl-label">Limitações</div>
                      <ul className="cc-insights-expl-ul">
                        {explainFor.explanation_layer.limitations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {explainFor.explanation_layer.reasoning_trace && (
                  <div className="cc-insights-expl-block">
                    <div className="cc-insights-expl-label">Raciocínio (resumo)</div>
                    <div className="cc-insights-expl-trace">{explainFor.explanation_layer.reasoning_trace}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <p className="cc-widget__empty">Nenhum insight no momento. Use &quot;Pergunte à IA&quot; para análises.</p>
      ) : (
        <ul className="cc-alertas__list">
          {items.map((item, i) => {
            const title = item.title || item.titulo || item.summary || item.message || 'Insight';
            const desc = item.description || item.descricao || item.summary;
            const warn = uncertaintyPhrase(item.explanation_layer);
            const hasExpl = item.explanation_layer && typeof item.explanation_layer === 'object';
            return (
              <li key={item.id ?? i} className="cc-alertas__item cc-alertas__item--low cc-insights-ia__row">
                <span className="cc-alertas__title">{title}</span>
                {warn && (
                  <span className="cc-insights-uncertainty" role="status">{warn}</span>
                )}
                {desc && <span className="cc-alertas__msg">{desc}</span>}
                {hasExpl && (
                  <button
                    type="button"
                    className="cc-insights-expl-btn"
                    onClick={() => setExplainFor(item)}
                  >
                    <Info size={14} aria-hidden />
                    Ver raciocínio
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
