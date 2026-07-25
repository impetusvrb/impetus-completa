import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ReceivingDockPanel({ docks = [] }) {
  if (!docks.length) return null;

  return (
    <section className="receiving-dock-panel" data-receiving-docks="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Gestão de docas · inbound</h3>
      <div className="receiving-dock-grid">
        {docks.map((d) => (
          <div key={d.id} className={`receiving-dock-card receiving-dock-card--${d.status}`}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{d.code}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: d.status === 'occupied' ? 'var(--amber)' : 'var(--green)' }}>{d.statusLabel}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>Doc: {d.order_number}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Agend.: {d.scheduled_at}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Permanência: {d.dwell_minutes} · Prior.: {d.priority}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
