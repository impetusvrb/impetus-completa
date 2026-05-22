import React from 'react';

export default function OperationalRadar({ blips = [] }) {
  return (
    <section className="cog-radar" aria-label="Radar operacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// RADAR</span>
      </header>
      <div className="cog-radar__viewport">
        <div className="cog-radar__ring cog-radar__ring--1" />
        <div className="cog-radar__ring cog-radar__ring--2" />
        <div className="cog-radar__ring cog-radar__ring--3" />
        <div className="cog-radar__sweep" aria-hidden />
        <div className="cog-radar__center" />
        {blips.map((b, i) => {
          const rad = (b.angle * Math.PI) / 180;
          const r = (b.distance || 0.5) * 42;
          const x = 50 + Math.cos(rad) * r;
          const y = 50 + Math.sin(rad) * r;
          return (
            <span
              key={`${b.label}-${i}`}
              className={`cog-radar__blip cog-radar__blip--${b.severity || 'low'}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={b.label}
            />
          );
        })}
      </div>
      <ul className="cog-radar__legend">
        {blips.slice(0, 4).map((b, i) => (
          <li key={i}>{b.label}</li>
        ))}
      </ul>
    </section>
  );
}
