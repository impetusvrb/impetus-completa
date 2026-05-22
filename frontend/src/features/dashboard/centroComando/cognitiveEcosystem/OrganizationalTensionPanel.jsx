import React from 'react';
import useAnimatedMetric from './useAnimatedMetric';

function TensionMetric({ label, value, suffix = '', accent }) {
  const num = typeof value === 'number' ? value : null;
  const animated = useAnimatedMetric(num ?? 0);
  const display = num != null ? `${Math.round(animated)}${suffix}` : value;

  return (
    <div className={`cog-tension__cell cog-tension__cell--${accent || 'cyan'}`}>
      <span className="cog-tension__label">{label}</span>
      <span className="cog-tension__value">{display}</span>
    </div>
  );
}

export default function OrganizationalTensionPanel({ tension }) {
  if (!tension) return null;
  return (
    <section className="cog-tension" aria-label="Tensão organizacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// TENSÃO ORGANIZACIONAL</span>
      </header>
      <div className="cog-tension__grid">
        <TensionMetric label="Sincronia organizacional" value={tension.organizational_sync_pct} suffix="%" accent="green" />
        <TensionMetric label="Pressão operacional" value={tension.operational_pressure} accent="amber" />
        <TensionMetric label="Confiança intersetorial" value={tension.intersector_confidence} accent="cyan" />
        <TensionMetric label="Tensão operacional" value={tension.operational_tension} accent="amber" />
        <TensionMetric label="Estabilidade liderança" value={tension.leadership_stability} accent="green" />
        <TensionMetric label="Índice fricção setorial" value={tension.sector_friction_index} suffix="%" accent="red" />
      </div>
    </section>
  );
}
