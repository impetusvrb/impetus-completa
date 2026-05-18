import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { environmentExecutive as exApi } from '../../../services/api.js';
import { isEnvironmentExecutiveRuntimeEnabled, getEnvironmentExecutiveFlagSnapshot } from './environmentExecutiveFeatureFlags.js';
import { ExecutiveKpiStrip } from './ExecutiveKpiStrip.jsx';

export default function EnvironmentExecutiveIntelligenceCenter({ companyId }) {
  const [health, setHealth] = useState(null);
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isEnvironmentExecutiveRuntimeEnabled()) return;
    exApi.health().then((r) => setHealth(r.data)).catch((e) => setErr(e.message));
  }, []);

  const runCockpit = async () => {
    setErr('');
    try {
      const { data } = await exApi.runCockpit({
        scope1_tco2e: 100,
        scope2_tco2e: 60,
        scope3_tco2e: 40,
        environmental_score: 65,
        esg_score: 62,
        production_rate: 100,
        emissions_co2: 55,
        emit_events: false
      });
      setPack(data.pack);
    } catch (e) {
      setErr(JSON.stringify(e?.response?.data || e.message));
    }
  };

  if (!isEnvironmentExecutiveRuntimeEnabled()) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Executive runtime desligado (shadow).</p>
      </div>
    );
  }

  const snap = getEnvironmentExecutiveFlagSnapshot();
  const maturity = pack?.maturity;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/app/environment/operational?view=executive&panel=esg" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4 }}>
          ESG
        </Link>
        <Link to="/app/environment/operational?view=executive&panel=sustainability" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4 }}>
          Sustentabilidade
        </Link>
        <Link to="/app/environment/operational?view=executive&panel=carbon" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4 }}>
          Carbono
        </Link>
        <Link to="/app/environment/operational?view=executive&panel=risk" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4 }}>
          Risco
        </Link>
        <Link to="/app/environment/operational?view=executive&panel=cross-domain" className="btn-ghost" style={{ minHeight: 44, padding: '0 12px', borderRadius: 4 }}>
          Cross-domain
        </Link>
        <button type="button" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }} onClick={runCockpit}>
          Cockpit completo
        </button>
      </div>
      {err ? <p style={{ color: 'var(--amber)', fontSize: 12 }}>{err}</p> : null}
      <ExecutiveKpiStrip
        items={[
          {
            label: 'Maturidade',
            value: maturity?.executive_maturity_score != null ? `${(maturity.executive_maturity_score * 100).toFixed(0)}%` : '—'
          },
          { label: 'Readiness', value: maturity?.environmental_readiness || '—', color: 'var(--green)' },
          { label: 'ESG', value: pack?.esg?.analytics?.overview?.esg_score ?? '—' }
        ]}
      />
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(health || snap, null, 0)}</pre>
        <div style={{ marginTop: 8 }}>tenant {String(companyId).slice(0, 8)}…</div>
      </div>
    </div>
  );
}
