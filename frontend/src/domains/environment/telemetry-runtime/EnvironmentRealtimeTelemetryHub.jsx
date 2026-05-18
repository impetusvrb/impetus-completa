import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { environmentTelemetry as etApi } from '../../../services/api.js';
import {
  getEnvironmentTelemetryFlagSnapshot,
  isEnvironmentTelemetryRuntimeEnabled
} from './environmentTelemetryFeatureFlags.js';
import { EnvironmentRealtimeStatusBar } from './EnvironmentRealtimeStatusBar.jsx';

export default function EnvironmentRealtimeTelemetryHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState('');
  const [connectors, setConnectors] = useState(null);
  const [edgeQueue, setEdgeQueue] = useState(null);

  useEffect(() => {
    if (!isEnvironmentTelemetryRuntimeEnabled()) return;
    etApi
      .health()
      .then((r) => setHealth(r.data))
      .catch((e) => setErr(e?.response?.data?.error || e.message || 'health'));
    etApi
      .connectorsStatus()
      .then((r) => setConnectors(r.data))
      .catch(() => {});
    etApi
      .edgeQueue()
      .then((r) => setEdgeQueue(r.data))
      .catch(() => {});
  }, []);

  if (!isEnvironmentTelemetryRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Telemetria ambiental industrial desligada (shadow).
        </p>
      </div>
    );
  }

  const snap = getEnvironmentTelemetryFlagSnapshot();
  const online = health?.ok !== false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EnvironmentRealtimeStatusBar
        online={online}
        edgePending={edgeQueue?.queue_size || 0}
        connector={connectors?.mqtt?.connected ? 'mqtt' : null}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link
          to="/app/environment/operational?view=telemetry&panel=realtime"
          className="btn-ghost"
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
        >
          Workspace realtime
        </Link>
        <Link
          to="/app/environment/operational?view=telemetry&panel=alerts"
          className="btn-ghost"
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
        >
          Alertas
        </Link>
        <Link
          to="/app/environment/operational?view=telemetry&panel=edge"
          className="btn-ghost"
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
        >
          Edge
        </Link>
      </div>
      {err ? <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p> : null}
      <div
        className="impetus-card"
        style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}
      >
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cyan)', marginBottom: 8 }}>
          Runtime telemetria / WAVE 3
        </div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(health || snap, null, 0)}</pre>
        <div style={{ marginTop: 8, opacity: 0.85 }}>tenant {String(companyId).slice(0, 8)}…</div>
      </div>
    </div>
  );
}
