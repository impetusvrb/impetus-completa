import React from 'react';

export function EnterpriseContinuityWorkspace({ continuity }) {
  if (!continuity) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Continuidade industrial
      </h3>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
        <li>Publication: {continuity.publication?.ok ? 'OK' : 'revisar'}</li>
        <li>Rollout: {continuity.rollout?.ok ? 'OK' : 'revisar'}</li>
        <li>Runtime: {continuity.runtime_continuity ? 'OK' : 'revisar'}</li>
        <li>Contextual: {continuity.contextual_continuity ? 'OK' : 'revisar'}</li>
      </ul>
    </div>
  );
}
