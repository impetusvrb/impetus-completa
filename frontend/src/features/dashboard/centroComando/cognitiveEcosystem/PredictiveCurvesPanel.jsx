import React from 'react';

function Sparkline({ data, color = 'var(--cyan)', height = 36 }) {
  if (!data?.length) return null;
  const w = 100;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="cog-spark" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" className="cog-spark__line" />
    </svg>
  );
}

export default function PredictiveCurvesPanel({ curves, predictions }) {
  if (!curves && !predictions?.length) return null;
  return (
    <section className="cog-curves" aria-label="IA preditiva visual">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// IA PREDITIVA</span>
        <span className="cog-panel__live">PROJEÇÃO</span>
      </header>
      <div className="cog-curves__grid">
        <div className="cog-curves__block">
          <span className="cog-curves__label">Curva de risco · 14d</span>
          <Sparkline data={curves?.risk_14d} color="var(--red)" />
        </div>
        <div className="cog-curves__block">
          <span className="cog-curves__label">Produtividade · 7d</span>
          <Sparkline data={curves?.productivity_7d} color="var(--green)" />
        </div>
        {curves?.turnover_risk_14d?.length > 0 && (
          <div className="cog-curves__block">
            <span className="cog-curves__label">Turnover · 14d</span>
            <Sparkline data={curves.turnover_risk_14d} color="var(--amber)" />
          </div>
        )}
        {curves?.nc_risk_14d?.length > 0 && (
          <div className="cog-curves__block">
            <span className="cog-curves__label">NC / desvios · 14d</span>
            <Sparkline data={curves.nc_risk_14d} color="var(--amber)" />
          </div>
        )}
      </div>
      <div className="cog-curves__preds">
        {(predictions || []).slice(0, 3).map((p) => (
          <div key={p.key} className="cog-curves__pred-mini">
            <span className="cog-curves__pred-title">{p.title}</span>
            {p.sparkline?.length > 0 && <Sparkline data={p.sparkline} height={28} />}
          </div>
        ))}
      </div>
    </section>
  );
}
