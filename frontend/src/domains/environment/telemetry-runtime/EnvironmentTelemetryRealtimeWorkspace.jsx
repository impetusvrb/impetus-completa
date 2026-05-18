import React, { useState, useCallback, useEffect } from 'react';
import { safeUUID } from '../../../utils/safeUuid.js';
import { environmentTelemetry as etApi } from '../../../services/api.js';
import { EnvironmentRealtimeStatusBar } from './EnvironmentRealtimeStatusBar.jsx';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

const METRICS = [
  { key: 'water.flow', area: 'water', type: 'flow', unit: 'm³/h', label: 'Vazão água' },
  { key: 'effluent.ph', area: 'effluent', type: 'ph', unit: 'pH', label: 'pH Efluente' },
  { key: 'emissions.co2', area: 'emissions', type: 'co2', unit: 'kg/h', label: 'CO₂' },
  { key: 'energy.demand', area: 'energy', type: 'demand', unit: 'kW', label: 'Demanda energia' }
];

function MetricCard({ metric, lastValue, loading, onIngest }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 180px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{metric.label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
        <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
          {lastValue != null ? lastValue.toFixed(1) : '—'}
          <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--text-secondary)' }}>{metric.unit}</span>
        </div>
        <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>{metric.area}</span>
      </div>
      <button
        type="button"
        className="btn-ghost"
        style={{ width: '100%', minHeight: 36, borderRadius: 3, fontSize: 12 }}
        disabled={loading}
        onClick={() => onIngest(metric)}
      >
        {loading ? '…' : 'Enviar leitura'}
      </button>
    </div>
  );
}

export function EnvironmentTelemetryRealtimeWorkspace({ companyId }) {
  const [values, setValues] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const [lastIngest, setLastIngest] = useState(null);

  const loadInitial = useCallback(async () => {
    try {
      const { data } = await etApi.health();
      if (data?.live_metrics) setValues(data.live_metrics);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const runIngest = useCallback(async (metric) => {
    setLoadingKey(metric.key);
    const value = Math.round(Math.random() * 1000) / 10;
    try {
      const { data } = await etApi.ingestV1({
        metric_key: metric.key,
        value,
        unit: metric.unit,
        environmental_area: metric.area,
        telemetry_type: metric.type,
        correlation_id: safeUUID(),
        source: 'environment_telemetry_workspace'
      });
      setValues((prev) => ({ ...prev, [metric.key]: data.value ?? value }));
      setLastIngest({ key: metric.key, label: metric.label, value: data.value ?? value, unit: metric.unit, ok: data.ok });
    } catch (e) {
      setLastIngest({ error: e?.response?.data?.error || e.message, key: metric.key });
    } finally { setLoadingKey(null); }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EnvironmentRealtimeStatusBar online={!loadingKey} syncing={!!loadingKey} />

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ ...mono, color: 'var(--cyan)' }}>Telemetria realtime ambiental</div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Água · ETE · Emissões · Energia · tenant {String(companyId).slice(0, 8)}…
            </p>
          </div>
          {lastIngest && (
            <div style={{ ...mono, fontSize: 10, color: lastIngest.error ? 'var(--amber)' : 'var(--green)', textAlign: 'right' }}>
              {lastIngest.error ? `Erro: ${lastIngest.error}` : `${lastIngest.label} → ${lastIngest.value?.toFixed(1)} ${lastIngest.unit}`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {METRICS.map((m) => (
            <MetricCard
              key={m.key}
              metric={m}
              lastValue={values[m.key]}
              loading={loadingKey === m.key}
              onIngest={runIngest}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EnvironmentTelemetryRealtimeWorkspace;
