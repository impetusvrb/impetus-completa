import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ClCognitiveMetricsPanel({ intelligence }) {
  const { healthScore = 0, riskScore = 0 } = intelligence || {};
  return (
    <section className="cl-cognitive-metrics-panel" data-cl-panel="metrics">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px', letterSpacing: 2, textTransform: 'uppercase' }}>
        Cognitive metrics
      </h4>
      <div className="cl-panel-grid">
        <div className="cl-panel-card">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Health Score</span>
          <span style={{ ...mono, fontSize: 16, color: healthScore >= 70 ? 'var(--green)' : healthScore >= 40 ? 'var(--amber)' : 'var(--red)' }}>{healthScore}</span>
        </div>
        <div className="cl-panel-card">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Risco operacional</span>
          <span style={{ ...mono, fontSize: 16, color: riskScore > 50 ? 'var(--red)' : 'var(--cyan)' }}>{riskScore}</span>
        </div>
      </div>
    </section>
  );
}
