import React from 'react';
import { mono } from './industrialModuleTokens.js';

/**
 * KPI cards responsivos — 4 / 6 / 8 colunas via CSS grid.
 */
export default function IndustrialKpiPanel({ items = [], columns = 4 }) {
  if (!items.length) return null;
  const colClass = columns >= 8 ? 'industrial-kpi--8' : columns >= 6 ? 'industrial-kpi--6' : 'industrial-kpi--4';
  return (
    <section className={`industrial-kpi-panel ${colClass}`} data-industrial-kpi-count={items.length}>
      {items.map((kpi) => (
        <div key={kpi.id || kpi.label} className="industrial-kpi-card impetus-card">
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>{kpi.label}</div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 20,
              color: kpi.color || 'var(--cyan)'
            }}
          >
            {kpi.value ?? '—'}
          </div>
          {kpi.hint && (
            <div style={{ ...mono, color: 'var(--text-tertiary)', marginTop: 4, fontSize: 9 }}>{kpi.hint}</div>
          )}
        </div>
      ))}
    </section>
  );
}
