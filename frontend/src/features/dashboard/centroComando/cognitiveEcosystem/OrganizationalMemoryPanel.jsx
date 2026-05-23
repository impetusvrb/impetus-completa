import React from 'react';

export default function OrganizationalMemoryPanel({ memory }) {
  const contextual = memory?.contextual_entries || [];
  const entries = memory?.entries || [];
  if (!entries.length && !contextual.length) return null;

  return (
    <section className="cog-omem" aria-label="Memória organizacional">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// MEMÓRIA CONTEXTUAL</span>
        <span className="cog-panel__meta">
          {memory.leadership_style || 'profunda'} · {memory.comparisons_active} comp.
        </span>
      </header>
      <ul className="cog-omem__list">
        {contextual.map((e, i) => (
          <li key={`c-${i}`} className="cog-omem__item cog-omem__item--ctx">
            <span className="cog-omem__type">{e.type}</span>
            <span className="cog-omem__text">{e.text}</span>
            <span className="cog-omem__meta">há {e.days_ago}d</span>
          </li>
        ))}
        {entries.map((e, i) => (
          <li key={i} className="cog-omem__item">
            <span className="cog-omem__type">{e.type}</span>
            <span className="cog-omem__text">{e.text}</span>
            <span className="cog-omem__meta">há {e.days_ago}d · {e.recurrence}</span>
          </li>
        ))}
      </ul>
      <p className="cog-omem__health">Índice memória {memory.index_health_pct}%</p>
    </section>
  );
}
