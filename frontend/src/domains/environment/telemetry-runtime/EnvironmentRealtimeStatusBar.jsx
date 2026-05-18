import React from 'react';

export function EnvironmentRealtimeStatusBar({ online = true, syncing = false, edgePending = 0, connector = null }) {
  const dotColor = online ? 'var(--green)' : 'var(--amber)';
  const syncLabel = syncing ? 'SINCRONIZANDO' : online ? 'ONLINE' : 'OFFLINE';

  return (
    <div
      className="impetus-card"
      style={{
        padding: '8px 12px',
        borderRadius: 4,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          className={online ? 'blink' : ''}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: online ? '0 0 6px var(--glow-green)' : '0 0 6px var(--glow-amber)'
          }}
        />
        {syncLabel}
      </span>
      {edgePending > 0 ? <span style={{ color: 'var(--amber)' }}>EDGE FILA: {edgePending}</span> : null}
      {connector ? <span style={{ color: 'var(--cyan)' }}>CONN: {connector}</span> : null}
    </div>
  );
}

export default EnvironmentRealtimeStatusBar;
