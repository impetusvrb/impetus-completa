import React, { useState, useEffect, useCallback } from 'react';
import { safeUUID } from '../../../utils/safeUuid.js';
import { qualityTelemetry as qtApi } from '../../../services/api.js';
import { isQualityTelemetryRuntimeEnabled } from './qualityTelemetryFeatureFlags.js';
import { isQualityTelemetryEffectiveEnabled } from '../navigation/qualityRuntimeModuleBridge.js';
import { Link } from 'react-router-dom';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function TelemetryKpiCard({ label, value, unit, trend, alert }) {
  const color = alert ? 'var(--amber)' : trend === 'up' ? 'var(--green)' : 'var(--cyan)';
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 160px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, color, fontFamily: 'var(--font-mono)' }}>
        {value ?? '—'}<span style={{ fontSize: 12, marginLeft: 4, color: 'var(--text-secondary)' }}>{unit}</span>
      </div>
      {trend && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{trend === 'up' ? '↑ crescente' : trend === 'down' ? '↓ decrescente' : '→ estável'}</div>}
    </div>
  );
}

function ProtocolStatusRow({ name, ok }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ ...mono, color: 'var(--text-secondary)' }}>{name}</span>
      <span style={{ ...mono, color: ok ? 'var(--green)' : 'var(--amber)', fontSize: 10 }}>
        {ok ? 'OK' : 'Verificar'}
      </span>
    </div>
  );
}

export default function QualityTelemetryHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadHealth = useCallback(async () => {
    if (!isQualityTelemetryRuntimeEnabled()) return;
    try {
      const { data } = await qtApi.health();
      setHealth(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const triggerIngest = useCallback(async (metricKey) => {
    const raw = window.prompt(`Informe o valor para ingestão da métrica "${metricKey}":`);
    if (raw == null || String(raw).trim() === '') return;
    const value = Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(value)) return;
    setLoading(true);
    try {
      const { data } = await qtApi.ingestV1({
        metric_key: metricKey,
        value,
        unit: 'count',
        correlation_id: safeUUID(),
        source: 'quality_telemetry_workspace'
      });
      setIngestResult(data);
    } catch (e) {
      setIngestResult({ ok: false, error: e?.response?.data?.error || e.message });
    } finally { setLoading(false); }
  }, []);

  if (!isQualityTelemetryEffectiveEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', ...mono }}>Telemetria industrial (Quality) desligada.</p>
      </div>
    );
  }

  const protocols = health?.wave3_status || health?.protocols || {};
  const wave3 = health?.wave3_enabled ?? health?.ok;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Telemetria Industrial
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            MQTT · OPC-UA · Modbus · WAVE 3 · tenant {String(companyId).slice(0, 8)}…
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/quality/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadHealth}>
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs de telemetria */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <TelemetryKpiCard label="Eventos/min" value={health?.events_per_minute ?? '—'} unit="ev/min" />
        <TelemetryKpiCard label="Latência média" value={health?.avg_latency_ms ?? '—'} unit="ms" />
        <TelemetryKpiCard label="Queue depth" value={health?.queue_depth ?? '—'} unit="itens" alert={(health?.queue_depth ?? 0) > 500} />
        <TelemetryKpiCard label="WAVE 3" value={wave3 ? 'Ativo' : 'Inativo'} trend={wave3 ? 'up' : null} alert={!wave3} />
      </div>

      {/* Status protocolos */}
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Status protocolos industriais</div>
        <ProtocolStatusRow name="MQTT" ok={protocols.mqtt ?? health?.ok} />
        <ProtocolStatusRow name="OPC-UA" ok={protocols.opcua ?? health?.ok} />
        <ProtocolStatusRow name="Modbus" ok={protocols.modbus ?? health?.ok} />
        <ProtocolStatusRow name="WAVE 3 Storage" ok={wave3} />
      </div>

      {/* Ingestão spot */}
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Ingestão spot — qualidade</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['quality.defect_rate', 'quality.spc_value', 'quality.inspection_count', 'quality.ncr_count'].map((key) => (
            <button key={key} type="button" className="btn-ghost"
              style={{ minHeight: 40, borderRadius: 4, fontSize: 12 }}
              disabled={loading}
              onClick={() => triggerIngest(key)}>
              {key.split('.')[1].replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {ingestResult ? (
          <div style={{ marginTop: 8 }}>
            <span style={{ ...mono, color: ingestResult.ok ? 'var(--green)' : 'var(--amber)' }}>
              {ingestResult.ok ? 'Ingestão OK' : `Erro: ${ingestResult.error}`}
            </span>
            {ingestResult.metric_id && <span style={{ ...mono, color: 'var(--text-tertiary)', marginLeft: 8 }}>{ingestResult.metric_id}</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
