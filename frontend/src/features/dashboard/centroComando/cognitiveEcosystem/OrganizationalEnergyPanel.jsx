import React from 'react';
import useAnimatedMetric from './useAnimatedMetric';

function Bar({ label, value, color }) {
  const v = useAnimatedMetric(value);
  return (
    <div className="cog-energy__bar">
      <span className="cog-energy__bar-label">{label}</span>
      <div className="cog-energy__bar-track">
        <div className="cog-energy__bar-fill" style={{ width: `${v}%`, '--c': color }} />
      </div>
      <span className="cog-energy__bar-val">{Math.round(v)}%</span>
    </div>
  );
}

export default function OrganizationalEnergyPanel({ energy }) {
  if (!energy) return null;
  return (
    <section className="cog-energy" aria-label="Energia organizacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// ENERGIA ORGANIZACIONAL</span>
        <span className="cog-panel__live">{energy.organism_state}</span>
      </header>
      <div className="cog-energy__bars">
        <Bar label="Moral organizacional" value={energy.morale_pct} color="var(--green)" />
        <Bar label="Energia operacional" value={energy.operational_energy_pct} color="var(--cyan)" />
        <Bar label="Sincronização" value={energy.sync_pct} color="var(--cyan)" />
      </div>
      <div className="cog-energy__meta">
        <span>Ritmo: {energy.operation_rhythm}</span>
        <span>Pressão: {energy.pressure}</span>
        <span>Estabilidade: {energy.stability}</span>
      </div>
    </section>
  );
}
