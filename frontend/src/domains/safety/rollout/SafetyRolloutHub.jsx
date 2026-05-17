import React from 'react';

export default function SafetyRolloutHub() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Rollout Enterprise SST
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Shadow → pilot → canary → staged → full. Rollback-safe.</p>
    </div>
  );
}
