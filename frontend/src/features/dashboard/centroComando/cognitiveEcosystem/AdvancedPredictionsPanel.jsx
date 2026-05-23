import React from 'react';

function Spark({ data }) {
  if (!data?.length) return null;
  const w = 80;
  const h = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - ((v - min) / range) * (h - 2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cog-adv-pred__spark">
      <polyline points={pts} fill="none" stroke="var(--cyan)" strokeWidth="1.2" />
    </svg>
  );
}

export default function AdvancedPredictionsPanel({ advanced }) {
  if (!advanced?.items?.length) return null;
  return (
    <section className="cog-adv-pred" aria-label="Previsão avançada">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// PREVISÃO AVANÇADA</span>
      </header>
      <div className="cog-adv-pred__grid">
        {advanced.items.map((item) => (
          <article key={item.key} className={`cog-adv-pred__card cog-adv-pred__card--${item.trend}`}>
            <h4>{item.label}</h4>
            <Spark data={item.curve} />
            <p className="cog-adv-pred__forecast">{item.forecast}</p>
            <span className="cog-adv-pred__mag">{item.magnitude}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
