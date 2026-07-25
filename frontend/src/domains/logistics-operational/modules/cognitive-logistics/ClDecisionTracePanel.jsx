import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ClDecisionTracePanel({ trace, onClose }) {
  if (!trace) return null;
  return (
    <aside className="cl-trace-panel-section impetus-card" role="region" aria-label="Decision trace">
      <span style={{ ...mono, color: 'var(--cyan)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Decision trace</span>
      <div className="cl-trace-chain">
        <div className="cl-trace-step">
          <strong>Recommendation</strong>
          <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(trace.recommendation, null, 2)}</pre>
        </div>
        <div className="cl-trace-step">
          <strong>Evidence</strong>
          <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(trace.evidence, null, 2)}</pre>
        </div>
        <div className="cl-trace-step">
          <strong>Metrics</strong>
          <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(trace.metrics, null, 2)}</pre>
        </div>
        <div className="cl-trace-step">
          <strong>Events</strong>
          <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(trace.events, null, 2)}</pre>
        </div>
        <div className="cl-trace-step">
          <strong>Operational contracts</strong>
          <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{JSON.stringify(trace.contracts, null, 2)}</pre>
        </div>
      </div>
      {onClose && (
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8, borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar trace
        </button>
      )}
    </aside>
  );
}
