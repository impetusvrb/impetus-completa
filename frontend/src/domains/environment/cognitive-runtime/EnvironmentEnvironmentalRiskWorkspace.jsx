import React, { useState, useEffect, useCallback } from 'react';
import { environmentCognitive as ecApi } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

export function EnvironmentEnvironmentalRiskWorkspace() {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ecApi.runInsights({
        signals: {
          telemetry_anomaly_score: 0.72,
          safety_chemical_exposure: 0.68,
          water_flow: [10, 11, 12, 14, 16, 18, 20, 22]
        },
        emit_events: false
      });
      setRisk(data.pack?.risk);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const score = risk?.environmental_risk_score ?? risk?.ecosystem_risk_score ?? risk?.predictive_risk_score ?? 0;
  const severity = risk?.severity || risk?.drift_severity;
  const color = score > 0.7 ? 'var(--red)' : score > 0.4 ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ ...mono, color: 'var(--red)' }}>Risco ambiental</div>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>

      {risk ? (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Score</div>
              <div style={{ fontSize: 36, fontFamily: 'var(--font-mono)', color }}>{(score * 100).toFixed(0)}%</div>
            </div>
            {severity && (
              <div>
                <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Severidade</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color, textTransform: 'uppercase' }}>{severity}</div>
              </div>
            )}
            <div>
              <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Status</div>
              <div style={{ fontSize: 14, color: score > 0.5 ? 'var(--amber)' : 'var(--green)' }}>
                {score > 0.7 ? 'Ação imediata' : score > 0.4 ? 'Monitorar' : 'Normal'}
              </div>
            </div>
          </div>

          {risk.explainability && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(risk.explainability).slice(0, 6).map(([k, v]) => (
                <div key={k} style={{ flex: '1 1 110px', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {typeof v === 'number' ? v.toFixed(3) : String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        loading ? <p style={{ ...mono, color: 'var(--text-secondary)', margin: 0 }}>Calculando risco…</p> : null
      )}
    </div>
  );
}

export default EnvironmentEnvironmentalRiskWorkspace;
