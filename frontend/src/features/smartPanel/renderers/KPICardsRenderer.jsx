import React from 'react';

export default function KPICardsRenderer({ cards = [] }) {
  if (!cards?.length) return null;
  return (
    <div className="smart-panel-visual__kpi-grid">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`smart-panel-visual__kpi-card smart-panel-visual__kpi-card--${c.level || 'ok'}`}
        >
          <span className="smart-panel-visual__kpi-title">{c.title}</span>
          <span className="smart-panel-visual__kpi-value">{c.value}</span>
          {c.subtitle && <span className="smart-panel-visual__kpi-sub">{c.subtitle}</span>}
        </div>
      ))}
    </div>
  );
}
