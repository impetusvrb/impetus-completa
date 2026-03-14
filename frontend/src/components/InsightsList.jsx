/**
 * LISTA DE INSIGHTS PRIORITÁRIOS DA IA
 */

import React from 'react';
import { AlertCircle, Info, TrendingUp } from 'lucide-react';
import './InsightsList.css';

export default function InsightsList({ insights = [], loading = false, onInsightClick }) {
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

  const getIcon = (type, severity) => {
    if (type === 'opportunity') return Info;
    return AlertCircle;
  };

  const getSeverityClass = (severity) => {
    const map = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return map[severity] || 'medium';
  };

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
      
      <div className="insights-list">
        {displayInsights.map((insight) => {
          const Icon = getIcon(insight.type, insight.severity);
          const severityClass = getSeverityClass(insight.severity);

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
                <div className="insight-meta">
                  <span className={`insight-badge badge-${severityClass}`}>
                    {insight.impact}
                  </span>
                  <span className="insight-suggestion">{insight.suggestion}</span>
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
