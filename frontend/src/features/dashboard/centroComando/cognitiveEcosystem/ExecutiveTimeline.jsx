import React from 'react';

export default function ExecutiveTimeline({ items = [] }) {
  return (
    <section className="cog-timeline" aria-label="Timeline operacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// TIMELINE EXECUTIVA</span>
      </header>
      <ol className="cog-timeline__track">
        {items.map((it, i) => (
          <li key={`${it.ts}-${i}`} className="cog-timeline__node">
            <span className="cog-timeline__time">{it.time}</span>
            <span className="cog-timeline__label">{it.label}</span>
            {it.detail ? <span className="cog-timeline__detail">{it.detail}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
