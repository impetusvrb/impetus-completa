import React, { useEffect, useMemo, useState } from 'react';
import { useOfflineStatus } from '../../../offline/useOfflineStatus.js';
import { getQualityOperationalTelemetrySnapshot } from '../../../observability/qualityOperationalTelemetry.js';
import { isQualityOperationalDiagnosticsEnabled } from './qualityOperationalFeatureFlags.js';

export function QualityRealtimeStatusBar({ companyId, flags, showFlagDump = false }) {
  const { isOnline, queueSize } = useOfflineStatus();
  const [degraded, setDegraded] = useState(false);
  const [telSnap, setTelSnap] = useState(() => getQualityOperationalTelemetrySnapshot());

  const shadowMs = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('impetus_q_shadow_chunk_ms');
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isOnline || queueSize > 5) setDegraded(true);
    else setDegraded(false);
  }, [isOnline, queueSize]);

  useEffect(() => {
    const id = setInterval(() => setTelSnap(getQualityOperationalTelemetrySnapshot()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        padding: '8px 10px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      }}
    >
      <span style={{ color: 'var(--cyan)' }}>tenant {String(companyId).slice(0, 8)}…</span>
      <span>{isOnline ? 'rede ok' : 'reconnect'}</span>
      <span>rto {telSnap.unified_reconnect_count}</span>
      {shadowMs ? <span style={{ opacity: 0.75 }}>sh {shadowMs}ms</span> : null}
      {degraded ? <span style={{ color: 'var(--amber)' }}>modo degradado</span> : null}
      {(showFlagDump || isQualityOperationalDiagnosticsEnabled()) && flags ? (
        <>
          <span style={{ opacity: 0.85 }}>op {flags.operational ? 'on' : 'off'}</span>
          <span style={{ opacity: 0.85 }}>off {flags.offline ? 'on' : 'off'}</span>
          <span style={{ opacity: 0.85 }}>rt {flags.realtime ? 'on' : 'off'}</span>
        </>
      ) : null}
    </div>
  );
}

export default QualityRealtimeStatusBar;
