/**
 * LISTA DE INSIGHTS PRIORITÁRIOS DA IA
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import './InsightsList.css';

function uncertaintyPhrase(layer) {
  if (!layer || typeof layer.confidence_score !== 'number' || layer.confidence_score >= 60) return null;
  const motivo =
    (Array.isArray(layer.limitations) && layer.limitations.length && layer.limitations.join('; ')) ||
    'dados limitados ou indicador em zona de alerta.';
  return `Esta recomendação possui alto grau de incerteza devido a ${motivo}`;
}

function severityToImpact(severity) {
  const map = {
    critical: 'Alto impacto',
    high: 'Alto impacto',
    alto: 'Alto impacto',
    medium: 'Médio impacto',
    médio: 'Médio impacto',
    low: 'Informativo',
    informativo: 'Informativo'
  };
  return map[severity] || 'Insight';
}

export default function InsightsList({ insights = [], loading = false, onInsightClick }) {
  const [explainFor, setExplainFor] = useState(null);

  const defaultInsights = [
    {
      id: 1,
      type: 'alert',
      severity: 'critical',
      title: 'Risco de atraso em manutenção crítica',
      impact: 'Alto Impacto',
      reference: 'Ref: 259.XXX.007',
      suggestion: 'Sugerido: Rever alocação de equipe'
    },
    {
      id: 2,
      type: 'opportunity',
      severity: 'medium',
      title: 'Oportunidade de otimização de consumo',
      impact: 'Médio Impacto',
      reference: 'Ref: 153.XXX.007',
      suggestion: 'Sugerido: Ajustar configuração B1'
    },
    {
      id: 3,
      type: 'alert',
      severity: 'high',
      title: 'Anomalia detectada: Pico de temperatura',
      impact: 'Alto Impacto',
      reference: 'Ref: 139.XXX.007',
      suggestion: 'Inspecionar setor Ar'
    }
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  const getIcon = (type) => {
    if (type === 'opportunity') return Info;
    return AlertCircle;
  };

  const getSeverityClass = (severity) => {
    const map = {
      critical: 'critical',
      high: 'high',
      alto: 'high',
      medium: 'medium',
      médio: 'medium',
      low: 'low',
      informativo: 'low'
    };
    return map[severity] || 'medium';
  };

  const closeModal = useCallback(() => setExplainFor(null), []);

  if (loading) {
    return (
      <div className="insights-card">
        <h3>Insights Prioritários da IA</h3>
        <div className="insights-loading">
          <div className="loading-spinner"></div>
          <p>Analisando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-card">
      <h3>Insights Prioritários da IA</h3>

      {explainFor && (
        <div
          className="insights-expl-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insights-expl-title"
          onClick={closeModal}
        >
          <div className="insights-expl-panel" onClick={(e) => e.stopPropagation()}>
            <div className="insights-expl-panel__head">
              <div className="insights-expl-panel__title-wrap">
                <Info size={18} className="insights-expl-panel__icon" aria-hidden />
                <div>
                  <div id="insights-expl-title" className="insights-expl-panel__title">
                    Fundamentos do insight
                  </div>
                  <div className="insights-expl-panel__subtitle">{explainFor.title}</div>
                </div>
              </div>
              <button type="button" className="insights-expl-panel__close" onClick={closeModal} aria-label="Fechar">
                ×
              </button>
            </div>
            {explainFor.explanation_layer && (
              <div className="insights-expl-body">
                {typeof explainFor.explanation_layer.confidence_score === 'number' && (
                  <div className="insights-expl-block">
                    <div className="insights-expl-label">Confiança (0–100)</div>
                    <div className="insights-expl-value">{explainFor.explanation_layer.confidence_score}</div>
                  </div>
                )}
                {Array.isArray(explainFor.explanation_layer.facts_used) &&
                  explainFor.explanation_layer.facts_used.length > 0 && (
                    <div className="insights-expl-block">
                      <div className="insights-expl-label">Factos utilizados</div>
                      <ul className="insights-expl-list">
                        {explainFor.explanation_layer.facts_used.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(explainFor.explanation_layer.business_rules) &&
                  explainFor.explanation_layer.business_rules.length > 0 && (
                    <div className="insights-expl-block">
                      <div className="insights-expl-label">Diretrizes</div>
                      <ul className="insights-expl-list">
                        {explainFor.explanation_layer.business_rules.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {Array.isArray(explainFor.explanation_layer.limitations) &&
                  explainFor.explanation_layer.limitations.length > 0 && (
                    <div className="insights-expl-block">
                      <div className="insights-expl-label">Limitações</div>
                      <ul className="insights-expl-list">
                        {explainFor.explanation_layer.limitations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {explainFor.explanation_layer.reasoning_trace && (
                  <div className="insights-expl-block">
                    <div className="insights-expl-label">Raciocínio (resumo)</div>
                    <div className="insights-expl-trace">{explainFor.explanation_layer.reasoning_trace}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="insights-list">
        {displayInsights.map((insight) => {
          const Icon = getIcon(insight.type);
          const severityClass = getSeverityClass(insight.severity);
          const impact = insight.impact || severityToImpact(insight.severity);
          const warn = uncertaintyPhrase(insight.explanation_layer);
          const hasExpl = insight.explanation_layer && typeof insight.explanation_layer === 'object';

          return (
            <div
              key={insight.id}
              className={`insight-item ${severityClass} ${onInsightClick ? 'insight-item--clickable' : ''}`}
              role={onInsightClick ? 'button' : undefined}
              tabIndex={onInsightClick ? 0 : undefined}
              onClick={onInsightClick ? () => onInsightClick(insight) : undefined}
              onKeyDown={onInsightClick ? (e) => e.key === 'Enter' && onInsightClick(insight) : undefined}
            >
              <div className="insight-icon">
                <Icon size={20} />
              </div>

              <div className="insight-content">
                <h4>{insight.title}</h4>
                {warn && insights.length > 0 && (
                  <div className="insight-uncertainty" role="status">
                    {warn}
                  </div>
                )}
                <div className="insight-meta">
                  <span className={`insight-badge badge-${severityClass}`}>{impact}</span>
                  <span className="insight-suggestion">{insight.suggestion || insight.summary}</span>
                  {hasExpl && (
                    <button
                      type="button"
                      className="insight-expl-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExplainFor(insight);
                      }}
                    >
                      <Info size={14} aria-hidden />
                      Ver raciocínio
                    </button>
                  )}
                </div>
                <div className="insight-reference">{insight.reference}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
