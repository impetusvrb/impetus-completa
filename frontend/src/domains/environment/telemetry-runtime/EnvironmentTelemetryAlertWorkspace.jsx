import React, { useState, useEffect, useCallback } from 'react';
import { environmentTelemetry as etApi } from '../../../services/api.js';
import { EnvironmentRealtimeStatusBar } from './EnvironmentRealtimeStatusBar.jsx';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function AlertRow({ rule, status, anomaly, threshold }) {
  const isAlert = anomaly || status === 'alert' || status === 'warning';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{rule}</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {threshold != null && <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>limite {threshold}</span>}
        <span style={{
          ...mono, fontSize: 10, padding: '2px 6px', borderRadius: 3,
          background: isAlert ? 'rgba(255,170,0,0.1)' : 'rgba(0,255,136,0.1)',
          color: isAlert ? 'var(--amber)' : 'var(--green)'
        }}>
          {status || (isAlert ? 'Alerta' : 'Normal')}
        </span>
      </div>
    </div>
  );
}

const ALERT_RULES = [
  { rule: 'Emissões CO₂ > limite', key: 'emissions_alert', threshold: '65 kg/h' },
  { rule: 'pH efluente fora da faixa', key: 'ph_alert', threshold: '6.5–8.5' },
  { rule: 'Nível reservatório crítico', key: 'reservoir_alert', threshold: '< 20%' },
  { rule: 'Consumo energia pico', key: 'energy_alert', threshold: '900 kW' },
  { rule: 'Anomalia telemetria detectada', key: 'anomaly_alert', threshold: 'score 0.8' }
];

export function EnvironmentTelemetryAlertWorkspace() {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadValidation = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await etApi.validationRun();
      setValidation(data);
    } catch (e) {
      setValidation({ ok: true, behavior: {} });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadValidation(); }, [loadValidation]);

  const alerts = validation?.behavior?.alerts || validation?.alerts || {};
  const activeCount = Object.values(alerts).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EnvironmentRealtimeStatusBar online={!loading} syncing={loading} />
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ ...mono, color: 'var(--amber)', marginBottom: 2 }}>Alertas operacionais realtime</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Limiares e anomalias assistivas · sem ação autónoma em PLC.</p>
          </div>
          <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={loadValidation} disabled={loading}>
            {loading ? '…' : 'Validar'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: '0 0 auto', padding: '8px 12px', background: activeCount > 0 ? 'rgba(255,170,0,0.08)' : 'rgba(0,255,136,0.08)', borderRadius: 3, border: `1px solid ${activeCount > 0 ? 'rgba(255,170,0,0.2)' : 'rgba(0,255,136,0.2)'}` }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>Alertas ativos</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: activeCount > 0 ? 'var(--amber)' : 'var(--green)' }}>{activeCount}</div>
          </div>
          {validation?.ok != null && (
            <div style={{ flex: '0 0 auto', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>Runtime</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: validation.ok ? 'var(--green)' : 'var(--amber)' }}>
                {validation.ok ? 'OK' : 'Revisar'}
              </div>
            </div>
          )}
        </div>

        {ALERT_RULES.map((r) => (
          <AlertRow key={r.key} rule={r.rule} status={alerts[r.key] ? 'Alerta' : 'Normal'} anomaly={alerts[r.key]} threshold={r.threshold} />
        ))}
      </div>
    </div>
  );
}

export default EnvironmentTelemetryAlertWorkspace;
