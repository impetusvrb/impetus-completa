import React, { useState } from 'react';
import { environmentGovernance } from '../../../../services/api.js';
import { govLabel, govCard } from './governanceUi.js';

export function EnvironmentGovernanceApiPanel({ title, subtitle, fetcher, sampleBody }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetcher(sampleBody || {});
      setResult(res?.data ?? res);
    } catch (e) {
      setResult({ ok: false, error: e?.message || 'request_failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="impetus-card" style={govCard}>
      <div style={govLabel}>{title}</div>
      {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 12px' }}>{subtitle}</p>}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        Assistivo · sem autoridade · shadow
      </p>
      <button type="button" className="btn" style={{ borderRadius: 4 }} onClick={run} disabled={loading}>
        {loading ? 'A processar…' : 'Avaliar amostra'}
      </button>
      {result && !result.error && result.ok !== false && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(result).filter(([k]) => !['ok','framework','generated_at','tenant_id'].includes(k)).slice(0, 6).map(([k, v]) => (
            <div key={k} style={{ flex: '1 1 120px', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 2 }}>{k.replace(/_/g, ' ')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: typeof v === 'number' ? 'var(--cyan)' : 'var(--text-secondary)' }}>
                {typeof v === 'number' ? v.toFixed(2) : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v).slice(0, 24)}
              </div>
            </div>
          ))}
        </div>
      )}
      {result?.error && (
        <p style={{ marginTop: 8, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{result.error}</p>
      )}
    </div>
  );
}

export function EnvironmentGovernancePackPanel() {
  return (
    <EnvironmentGovernanceApiPanel
      title="Governance pack"
      subtitle="ESG · compliance · carbono · energia · sustentabilidade"
      fetcher={(body) => environmentGovernance.governancePack(body)}
      sampleBody={{
        scope1_tco2e: 120,
        scope2_tco2e: 80,
        energy_kwh: 50000,
        water_m3: 1200,
        licenses: [{ id: 'L1', days_to_expire: 45 }]
      }}
    />
  );
}
