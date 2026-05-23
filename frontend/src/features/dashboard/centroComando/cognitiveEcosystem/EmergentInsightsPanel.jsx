import React from 'react';

export default function EmergentInsightsPanel({ emergent }) {
  if (!emergent?.items?.length) return null;
  return (
    <section className="cog-emergent" aria-label="Comportamento emergente">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// INTELIGÊNCIA EMERGENTE</span>
        <span className="cog-panel__meta">{emergent.engine}</span>
      </header>
      <ul className="cog-emergent__list">
        {emergent.items.map((item, i) => (
          <li key={i} className="cog-emergent__item">
            <p className="cog-emergent__hyp">{item.hypothesis}</p>
            <span className="cog-emergent__meta">
              {item.discovered_by} · {item.confidence_pct}% confiança
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
