import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ClPredictiveInsightsPanel({ insights = [], selectedInsight, onSelect }) {
  if (!insights.length) return null;
  return (
    <section className="cl-predictive-panel" data-cl-panel="predictive">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px', letterSpacing: 2, textTransform: 'uppercase' }}>
        Predictive insights
      </h4>
      <div className="cl-panel-grid">
        {insights.slice(0, 8).map((i) => (
          <button
            key={i.id}
            type="button"
            className={`cl-panel-card cl-panel-card--${i.severity}${selectedInsight?.id === i.id ? ' cl-panel-card--selected' : ''}`}
            onClick={() => onSelect?.(i)}
          >
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>{i.category}</span>
            <span style={{ ...mono, fontSize: 11, color: 'var(--cyan)' }}>{i.title}</span>
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-secondary)' }}>Conf. {Math.round((i.confidence || 0) * 100)}% · {i.horizon}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
