import React from 'react';

export default function DecisionEnginePanel({ engine }) {
  if (!engine?.decisions?.length) return null;
  return (
    <section className="cog-decision" aria-label="Engine de decisão">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// ENGINE DE DECISÃO</span>
      </header>
      <ul className="cog-decision__list">
        {engine.decisions.map((d, i) => (
          <li key={i} className={`cog-decision__item cog-decision__item--${d.priority}`}>
            <strong>{d.action}</strong>
            <span className="cog-decision__impact">{d.impact}</span>
            <span className="cog-decision__domain">{d.domain}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
