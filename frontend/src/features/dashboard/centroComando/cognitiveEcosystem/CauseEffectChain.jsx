import React from 'react';

export default function CauseEffectChain({ causeEffect }) {
  if (!causeEffect?.chains?.length) return null;
  return (
    <section className="cog-causal" aria-label="Engine de causa e efeito">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// CAUSA → EFEITO</span>
        <span className="cog-panel__meta">{causeEffect.engine}</span>
      </header>
      <ul className="cog-causal__list">
        {causeEffect.chains.map((c, i) => (
          <li key={i} className="cog-causal__item">
            <span className="cog-causal__cause">{c.cause}</span>
            <span className="cog-causal__arrow" aria-hidden>
              ⟹
            </span>
            <span className="cog-causal__effect">{c.effect}</span>
            <span className="cog-causal__conf">{c.confidence_pct}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
