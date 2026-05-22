import React from 'react';

function trendIcon(trend) {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function MiniSpark({ data }) {
  if (!data?.length) return null;
  const w = 60;
  const h = 18;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(' ');
  return (
    <svg className="cog-predict__spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="var(--amber)" strokeWidth="1" />
    </svg>
  );
}

export default function StrategicPredictions({ predictions = [] }) {
  if (!predictions.length) return null;
  return (
    <section className="cog-predict" aria-label="Previsão estratégica">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// PREVISÃO ESTRATÉGICA</span>
      </header>
      <div className="cog-predict__grid">
        {predictions.map((p) => (
          <article key={p.key} className="cog-predict__card cog-predict__card--live">
            <h3 className="cog-predict__title">{p.title}</h3>
            <MiniSpark data={p.sparkline} />
            <p className="cog-predict__level">
              <span className="cog-predict__trend">{trendIcon(p.trend)}</span> {p.level}
              <span className="cog-predict__horizon"> · {p.horizon}</span>
            </p>
            <p className="cog-predict__detail">{p.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
