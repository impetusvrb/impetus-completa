import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { qualityTelemetry as qtApi } from '../../../services/api.js';
import { getQualityTelemetryFlagSnapshot, isQualityTelemetryRuntimeEnabled } from './qualityTelemetryFeatureFlags.js';

/**
 * Hub técnico — ingestão enterprise; não altera fluxos de inspeção nem governança.
 */
export default function QualityTelemetryHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState('');
  const [demoResult, setDemoResult] = useState(null);

  useEffect(() => {
    if (!isQualityTelemetryRuntimeEnabled()) return;
    qtApi
      .health()
      .then((r) => setHealth(r.data))
      .catch((e) => setErr(e?.response?.data?.error || e.message || 'health'));
  }, []);

  const runDryDemo = async () => {
    setDemoResult(null);
    try {
      const { data } = await qtApi.ingestV1({
        metric_key: 'demo.quality.telemetry.runtime',
        value: 1,
        unit: 'count',
        correlation_id: crypto.randomUUID(),
        labels: { demo: true },
        source: 'quality_telemetry_hub'
      });
      setDemoResult(data);
    } catch (e) {
      setDemoResult({ error: e?.response?.data || e.message });
    }
  };

  if (!isQualityTelemetryRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Telemetria industrial (Quality) desligada.</p>
      </div>
    );
  }

  const snap = getQualityTelemetryFlagSnapshot();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Link
          to="/app/quality/operational"
          className="btn-ghost"
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
        >
          Voltar operacional
        </Link>
      </div>

      {err ? (
        <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p>
      ) : null}

      <div className="impetus-card" style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cyan)', marginBottom: 8 }}>Estado runtime / WAVE 3</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(health || snap, null, 0)}</pre>
        <div style={{ marginTop: 8, opacity: 0.85 }}>tenant {String(companyId).slice(0, 8)}…</div>
      </div>

      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
          Chamada de ingestão (tenant da sessão)
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          Requer WAVE 3 (`IMPETUS_STORAGE_V3_ENABLED` + `IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED`). Sem BD configurada verá 502 — esperado em dev.
        </p>
        <button type="button" className="btn-ghost" style={{ minHeight: 48, borderRadius: 4 }} onClick={runDryDemo}>
          Demo ingestão v1 (API)
        </button>
        {demoResult ? (
          <pre style={{ marginTop: 10, fontSize: 11, color: 'var(--green)', whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(demoResult, null, 2)}</pre>
        ) : null}
      </div>
    </div>
  );
}
