import React, { useState, useEffect } from 'react';

export default function CognitiveCoreHub({ core, consciousness }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phrases = consciousness?.phrases || [consciousness?.active_phrase].filter(Boolean);

  useEffect(() => {
    if (phrases.length < 2) return undefined;
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % phrases.length), 4500);
    return () => clearInterval(t);
  }, [phrases.length]);

  if (!core) return null;

  return (
    <section className="cog-core-hub" aria-label="IMPETUS Cognitive Core">
      <header className="cog-core-hub__head">
        <span className="cog-core-hub__orb" />
        <div>
          <h2 className="cog-core-hub__title">{core.name}</h2>
          <p className="cog-core-hub__codename">{core.codename} · v{core.version}</p>
        </div>
        <span className="cog-core-hub__awareness">
          {core.awareness_level_pct != null ? `${core.awareness_level_pct}% awareness` : 'AWAITING DATA'}
        </span>
      </header>
      <p className="cog-core-hub__consciousness">
        <span className="cog-core-hub__consciousness-tag">{consciousness?.awareness_state || 'ATIVO'}</span>
        {phrases[phraseIdx] || consciousness?.active_phrase}
      </p>
      <div className="cog-core-hub__status-grid">
        {Object.entries(core.status || {}).map(([key, val]) => (
          <div key={key} className="cog-core-hub__status-cell">
            <span className="cog-core-hub__status-key">{key.replace(/_/g, ' ')}</span>
            <span className={`cog-core-hub__status-val cog-core-hub__status-val--${String(val).toLowerCase()}`}>
              {val}
            </span>
          </div>
        ))}
      </div>
      <p className="cog-core-hub__throughput">
        {core.throughput_events_per_min} eventos/min · modo {core.operational_mode}
      </p>
    </section>
  );
}
