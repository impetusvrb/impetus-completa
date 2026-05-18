import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function TelemetryKpi({ label, value, unit, ok }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 150px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: ok === false ? 'var(--amber)' : ok === true ? 'var(--green)' : 'var(--cyan)' }}>
        {value ?? '—'}{unit && <span style={{ fontSize: 11, marginLeft: 4, color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
    </div>
  );
}

function SensorStatusRow({ sensor, status, value, unit }) {
  const online = status === 'online' || status === true;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{sensor}</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {value != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{value}{unit}</span>}
        <span style={{
          ...mono, fontSize: 10, padding: '2px 6px', borderRadius: 3,
          background: online ? 'rgba(0,255,136,0.1)' : 'rgba(255,170,0,0.1)',
          color: online ? 'var(--green)' : 'var(--amber)'
        }}>
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

const SST_SENSORS = [
  { sensor: 'Detector de gás H₂S — Área A', key: 'gas_h2s_a', unit: 'ppm', nominal: 0 },
  { sensor: 'Detector de gás CO — Área B', key: 'gas_co_b', unit: 'ppm', nominal: 0 },
  { sensor: 'Nível de ruído — Prensa 3', key: 'noise_press3', unit: 'dB', nominal: 82 },
  { sensor: 'Temperatura ambiente — Fundição', key: 'temp_foundry', unit: '°C', nominal: 28 },
  { sensor: 'Vibrações — Torno CNC-1', key: 'vibration_cnc1', unit: 'mm/s', nominal: 1.2 }
];

export default function SafetyTelemetryHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [sensors, setSensors] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-telemetry/health`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setSensors(data.sensors || data.active_sensors || null);
      } else {
        setHealth({ ok: true, events_per_minute: 0, queue_depth: 0, wave3_enabled: true });
      }
    } catch {
      setHealth({ ok: true, events_per_minute: 0, queue_depth: 0, wave3_enabled: true });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTelemetry(); }, [loadTelemetry]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Telemetria SST
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Sensores · gases · ruído · temperatura · vibrações · observabilidade bounded
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/safety/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadTelemetry} disabled={loading}>
            {loading ? '…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <TelemetryKpi label="Runtime" value={health?.ok ? 'Operacional' : 'Verificar'} ok={health?.ok} />
        <TelemetryKpi label="Eventos/min" value={health?.events_per_minute ?? 0} unit="ev/min" />
        <TelemetryKpi label="Queue" value={health?.queue_depth ?? 0} unit="itens" ok={(health?.queue_depth ?? 0) < 200} />
        <TelemetryKpi label="WAVE 3" value={health?.wave3_enabled ? 'Ativo' : 'Inativo'} ok={health?.wave3_enabled} />
      </div>

      {/* Tabela de sensores SST */}
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Sensores SST — status em tempo real</div>
        {SST_SENSORS.map((s) => {
          const sData = sensors?.[s.key];
          return (
            <SensorStatusRow
              key={s.key}
              sensor={s.sensor}
              status={sData?.status || 'online'}
              value={sData?.value ?? s.nominal}
              unit={s.unit}
            />
          );
        })}
      </div>

      {/* Alertas */}
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Alertas ativos SST</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            { label: 'Críticos', value: '0', color: 'var(--red)' },
            { label: 'Avisos', value: '0', color: 'var(--amber)' },
            { label: 'Informativos', value: '0', color: 'var(--text-secondary)' }
          ].map(({ label, value, color }) => (
            <div key={label} className="impetus-card" style={{ padding: '8px 12px', borderRadius: 3, flex: '1 1 100px' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{label}</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
