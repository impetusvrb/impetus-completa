import React, { useState, useEffect } from 'react';
import { environmentTelemetry as etApi } from '../../../services/api.js';
import { isEnvironmentTelemetryEdgeEnabled } from './environmentTelemetryFeatureFlags.js';
import { EnvironmentRealtimeStatusBar } from './EnvironmentRealtimeStatusBar.jsx';

export function EnvironmentEdgeTelemetryWorkspace() {
  const [queue, setQueue] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const refreshQueue = () => {
    etApi.edgeQueue().then((r) => setQueue(r.data)).catch(() => setQueue(null));
  };

  useEffect(() => {
    if (isEnvironmentTelemetryEdgeEnabled()) refreshQueue();
  }, []);

  const enqueueDemo = async () => {
    await etApi.edgeEnqueue({
      metric_key: 'edge.demo.flow',
      value: 42,
      unit: 'm3/h',
      environmental_area: 'water',
      telemetry_type: 'flow',
      edge_sequence: String(Date.now()),
      idempotency_key: `edge-${Date.now()}`
    });
    refreshQueue();
  };

  const syncEdge = async () => {
    setSyncing(true);
    try {
      const { data } = await etApi.edgeSync();
      setSyncResult(data);
      refreshQueue();
    } catch (e) {
      setSyncResult({ error: e?.response?.data || e.message });
    } finally {
      setSyncing(false);
    }
  };

  if (!isEnvironmentTelemetryEdgeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Edge telemetry desligado — ative VITE_IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EnvironmentRealtimeStatusBar syncing={syncing} edgePending={queue?.queue_size || 0} />
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cyan)' }}>
            Edge — fila · replay · sincronização
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={enqueueDemo}>
              + Evento
            </button>
            <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={syncEdge} disabled={syncing}>
              {syncing ? 'Sync…' : 'Sincronizar'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'Fila edge', value: queue?.queue_size ?? 0, color: (queue?.queue_size ?? 0) > 50 ? 'var(--amber)' : 'var(--green)' },
            { label: 'Última sync', value: syncResult?.synced_count != null ? `${syncResult.synced_count} itens` : '—', color: 'var(--cyan)' },
            { label: 'Edge status', value: queue?.edge_online ? 'Online' : 'Offline', color: queue?.edge_online ? 'var(--green)' : 'var(--amber)' }
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: '1 1 120px', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color }}>{value}</div>
            </div>
          ))}
        </div>
        {syncResult?.ok === false && (
          <p style={{ marginTop: 8, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{syncResult.error || 'Sync falhou'}</p>
        )}
      </div>
    </div>
  );
}

export default EnvironmentEdgeTelemetryWorkspace;
