import React, { useState, useEffect, useCallback } from 'react';
import { environmentCognitive as ecApi } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function CorrelationCard({ label, value, unit, color }) {
  const pct = typeof value === 'number' && value <= 1 ? `${(value * 100).toFixed(0)}%` : value;
  return (
    <div style={{ flex: '1 1 140px', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: color || 'var(--text-secondary)', marginTop: 3 }}>
        {pct ?? '—'}{unit && <span style={{ fontSize: 10, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

export function EnvironmentCrossDomainWorkspace() {
  const [cross, setCross] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ecApi.runInsights({
        signals: {
          production_rate: [100, 105, 110],
          emissions_co2: [48, 52, 58],
          logistics_carbon_index: 0.65,
          quality_waste_correlation: 0.7,
          waste_generation: [4, 4.5, 5]
        },
        emit_events: false
      });
      setCross(data.pack?.cross_domain || data.pack);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ ...mono, color: 'var(--green)', marginBottom: 2 }}>Correlação multi-domínio</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Produção · qualidade · segurança · logística · energia — assistivo.</p>
        </div>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>
      {cross ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {cross.production_emission_ratio != null && <CorrelationCard label="Produção/Emissão" value={cross.production_emission_ratio} color="var(--cyan)" />}
          {cross.quality_waste_link != null && <CorrelationCard label="Qualidade/Resíduo" value={cross.quality_waste_link} color="var(--amber)" />}
          {cross.logistics_carbon_offset != null && <CorrelationCard label="Logística carbono" value={cross.logistics_carbon_offset} color="var(--text-primary)" />}
          {cross.cross_domain_risk != null && <CorrelationCard label="Risco cross-domain" value={cross.cross_domain_risk} color={cross.cross_domain_risk > 0.5 ? 'var(--red)' : 'var(--green)'} />}
          {Object.keys(cross).filter(k => !['production_emission_ratio','quality_waste_link','logistics_carbon_offset','cross_domain_risk'].includes(k)).slice(0,4).map(k => (
            <CorrelationCard key={k} label={k.replace(/_/g,' ')} value={cross[k]} />
          ))}
        </div>
      ) : (
        loading ? <p style={{ ...mono, color: 'var(--text-secondary)', marginTop: 8 }}>Analisando correlações…</p> : null
      )}
    </div>
  );
}

export default EnvironmentCrossDomainWorkspace;
