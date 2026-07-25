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
  const unavailable = status == null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{sensor}</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {value != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{value}{unit}</span>}
        <span style={{
          ...mono, fontSize: 10, padding: '2px 6px', borderRadius: 3,
          background: online ? 'rgba(0,255,136,0.1)' : 'rgba(255,170,0,0.1)',
          color: online ? 'var(--green)' : unavailable ? 'var(--text-tertiary)' : 'var(--amber)'
        }}>
          {online ? 'Online' : unavailable ? 'Indisponível' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

export default function SafetyTelemetryHub({ companyId }) {
  const [health, setHealth] = useState(null);
  const [sensors, setSensors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTelemetry = useCallback(async () => {
    setLoading(true);
    setError('');
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
        setHealth(null);
        setSensors(null);
        setError('Telemetria indisponível.');
      }
    } catch {
      setHealth(null);
      setSensors(null);
      setError('Telemetria indisponível.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTelemetry(); }, [loadTelemetry]);

  const sensorEntries = Array.isArray(sensors)
    ? sensors
    : sensors && typeof sensors === 'object'
      ? Object.entries(sensors).map(([key, value]) => ({
          key,
          sensor: value?.sensor || value?.name || key,
          status: value?.status,
          value: value?.value,
          unit: value?.unit || ''
        }))
      : [];
  const telemetryEnabled = health?.telemetry_enabled;
  const runtimeValue = telemetryEnabled === true
    ? 'Habilitado'
    : telemetryEnabled === false
      ? 'Não configurado'
      : 'Indisponível';
  const alertMetrics = [
    { label: 'Críticos', value: health?.alerts?.critical ?? health?.critical_alerts, color: 'var(--red)' },
    { label: 'Avisos', value: health?.alerts?.warning ?? health?.warning_alerts, color: 'var(--amber)' },
    { label: 'Informativos', value: health?.alerts?.informational ?? health?.informational_alerts, color: 'var(--text-secondary)' }
  ];

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
        <TelemetryKpi label="Runtime" value={runtimeValue} ok={telemetryEnabled === true ? true : undefined} />
        <TelemetryKpi label="Eventos/min" value={health?.events_per_minute} unit="ev/min" />
        <TelemetryKpi
          label="Queue"
          value={health?.queue_depth}
          unit="itens"
          ok={typeof health?.queue_depth === 'number' ? health.queue_depth < 200 : undefined}
        />
        <TelemetryKpi
          label="WAVE 3"
          value={typeof health?.wave3_enabled === 'boolean' ? (health.wave3_enabled ? 'Ativo' : 'Inativo') : '—'}
          ok={typeof health?.wave3_enabled === 'boolean' ? health.wave3_enabled : undefined}
        />
      </div>

      {error ? (
        <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
          <p role="status" style={{ ...mono, color: 'var(--amber)', margin: 0 }}>{error}</p>
        </div>
      ) : null}

      {/* Tabela de sensores SST */}
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Sensores SST — status em tempo real</div>
        {sensorEntries.length > 0 ? sensorEntries.map((sensor) => (
          <SensorStatusRow
            key={sensor.key || sensor.id || sensor.sensor}
            sensor={sensor.sensor || sensor.name || sensor.key}
            status={sensor.status}
            value={sensor.value}
            unit={sensor.unit || ''}
          />
        )) : (
          <p role="status" style={{ ...mono, color: 'var(--text-tertiary)', margin: 0 }}>
            Sensor não configurado ou sem dados disponíveis.
          </p>
        )}
      </div>

      {/* Alertas */}
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Alertas ativos SST</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {alertMetrics.map(({ label, value, color }) => (
            <div key={label} className="impetus-card" style={{ padding: '8px 12px', borderRadius: 3, flex: '1 1 100px' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{label}</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: value == null ? 'var(--text-tertiary)' : color }}>
                {value ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
