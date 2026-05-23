import React, { useState, useEffect } from 'react';

export default function CognitiveGlobalStrip({ core, presence }) {
  const [tick, setTick] = useState(0);
  const status = core?.status || {};
  const engines = [
    ['Cognitive Core', status.cognitive_core],
    ['Behavior Mapping', status.behavior_mapping],
    ['Cross-analysis', status.cross_analysis],
    ['Operational Sync', status.operational_sync],
    ['Organizational Awareness', status.organizational_awareness],
    ['Predictive Engine', status.predictive_engine || status.predictive_layer]
  ].filter(([, v]) => v);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2400);
    return () => clearInterval(t);
  }, []);

  if (!core) return null;

  return (
    <div className="cog-global-strip" role="status" aria-live="polite">
      <span className="cog-global-strip__brand">{core.name}</span>
      <span className="cog-global-strip__pulse" aria-hidden />
      <div className="cog-global-strip__engines">
        {engines.map(([label, val]) => (
          <span
            key={label}
            className={`cog-global-strip__chip ${val === 'RUNNING' || val === 'SYNCING' ? 'cog-global-strip__chip--run' : ''}`}
          >
            {label}: <strong>{val}</strong>
          </span>
        ))}
      </div>
      <span className="cog-global-strip__meta">
        {presence?.heartbeat_bpm ?? 64} bpm · {core.awareness_level_pct}% awareness
        {tick % 2 === 0 ? ' · ONLINE' : ''}
      </span>
    </div>
  );
}
