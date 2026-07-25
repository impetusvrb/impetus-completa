import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function WiFlowAnalyticsPanel({ flow }) {
  if (!flow?.stages?.length) return null;
  return (
    <div className="wi-flow-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Flow analytics</h4>
      <div className="wi-flow-chain">
        {flow.stages.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <span className="wi-flow-arrow">↓</span>}
            <div className="wi-flow-stage">
              <span style={{ ...mono, fontSize: 9, color: 'var(--cyan)' }}>{s.label}</span>
              <span style={{ ...mono, fontSize: 11 }}>abertas {s.open ?? 0} · esperas {s.waits ?? 0}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      {flow.summary && (
        <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
          Filas {flow.summary.totalOpenQueues} · lead picking ~{flow.summary.avgPickingLeadMin ?? '—'} min
        </p>
      )}
    </div>
  );
}
