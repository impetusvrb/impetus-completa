import React from 'react';

export default function GlobalOperationState({ state }) {
  if (!state) return null;
  return (
    <section className="cog-global" aria-label="Estado global da operação">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// ESTADO GLOBAL DA OPERAÇÃO</span>
        <span className="cog-global__badge">{state.company_status}</span>
      </header>
      <h3 className="cog-global__headline">{state.headline}</h3>
      <div className="cog-global__metrics">
        <div>
          <span className="cog-global__k">Saúde organizacional</span>
          <span className="cog-global__v">{state.organizational_health_pct}%</span>
        </div>
        <div>
          <span className="cog-global__k">Risco global</span>
          <span className="cog-global__v">{state.global_risk}</span>
        </div>
        <div>
          <span className="cog-global__k">Tendência</span>
          <span className="cog-global__v cog-global__v--cyan">{state.operational_trend}</span>
        </div>
      </div>
      <ul className="cog-global__bullets">
        {(state.bullets || []).map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <div className="cog-global__watch">
        <span className="cog-global__k">Setores em observação</span>
        <div className="cog-global__chips">
          {(state.sectors_on_watch || []).map((s) => (
            <span key={s} className="cog-global__chip">
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
