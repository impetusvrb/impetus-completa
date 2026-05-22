import React from 'react';

export default function OperationalHeatmap({ sectors = [] }) {
  return (
    <section className="cog-heatmap" aria-label="Heatmap operacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// HEATMAP SETORIAL</span>
      </header>
      <div className="cog-heatmap__grid">
        {sectors.map((s) => (
          <div
            key={s.id}
            className="cog-heatmap__cell"
            style={{ '--heat': `${s.intensity}%` }}
            title={`${s.name}: ${s.label}`}
          >
            <span className="cog-heatmap__name">{s.name}</span>
            <span className="cog-heatmap__intensity">{s.intensity}%</span>
            <span className="cog-heatmap__label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
