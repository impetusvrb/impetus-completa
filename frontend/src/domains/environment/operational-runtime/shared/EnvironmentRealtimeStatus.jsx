import React, { useEffect, useState } from 'react';
import { isEnvironmentRealtimeRuntimeEnabled } from '../environmentOperationalFeatureFlags.js';
import { labelStyle } from './operationalUi.js';

export function EnvironmentRealtimeStatus({ area }) {
  const [last, setLast] = useState(null);

  useEffect(() => {
    if (!isEnvironmentRealtimeRuntimeEnabled()) return undefined;
    const handler = (payload) => {
      if (payload?.payload?.area && payload.payload.area !== area) return;
      setLast(new Date().toISOString());
    };
    try {
      const sock = window.__impetus_socket;
      sock?.on?.('environment_operational_update', handler);
      return () => sock?.off?.('environment_operational_update', handler);
    } catch {
      return undefined;
    }
  }, [area]);

  if (!isEnvironmentRealtimeRuntimeEnabled()) return null;

  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
      <span style={labelStyle}>Realtime</span> {last ? `último evento ${last}` : 'à escuta (shadow)'}
    </p>
  );
}
