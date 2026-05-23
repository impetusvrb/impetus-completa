import React from 'react';
import useAnimatedMetric from './useAnimatedMetric';

function Metric({ label, value, suffix = '' }) {
  const num = typeof value === 'number' ? value : null;
  const anim = useAnimatedMetric(num);
  const display = num != null ? `${Math.round(anim)}${suffix}` : value;
  return (
    <div className="cog-strat__cell">
      <span className="cog-strat__label">{label}</span>
      <span className="cog-strat__value">{display}</span>
    </div>
  );
}

export default function StrategicIntelligenceHub({ intel }) {
  if (!intel) return null;
  return (
    <section className="cog-strat" aria-label="Inteligência estratégica">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// INTELIGÊNCIA ESTRATÉGICA</span>
      </header>
      <div className="cog-strat__grid">
        <Metric label="Estabilidade org." value={intel.organizational_stability} />
        <Metric label="Pressão operacional" value={intel.operational_pressure} />
        <Metric label="Tensão intersetorial" value={intel.intersector_tension} />
        <Metric label="Maturidade operacional" value={intel.operational_maturity_pct} suffix="%" />
        <Metric label="Confiança organizacional" value={intel.organizational_trust_pct} suffix="%" />
        <Metric label="Índice sincronização" value={intel.sync_index_pct} suffix="%" />
      </div>
    </section>
  );
}
