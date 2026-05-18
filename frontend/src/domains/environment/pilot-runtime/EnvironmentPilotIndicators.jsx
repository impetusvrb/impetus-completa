import React from 'react';

function Metric({ label, value, tone = 'cyan' }) {
  const color = tone === 'green' ? 'var(--green)' : tone === 'amber' ? 'var(--amber)' : 'var(--cyan)';
  return (
    <div className="impetus-card" style={{ padding: '0.75rem', borderRadius: 4, flex: '1 1 140px', minWidth: 120 }}>
      <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 18, color, fontFamily: 'var(--font-mono)' }}>{value}</p>
    </div>
  );
}

export function EnvironmentPilotIndicators({ pack }) {
  if (!pack) return null;
  const pr = pack.pilot_readiness || {};
  const mat = pack.operational_maturity || {};
  const erg = pack.operational_ergonomics || {};
  const sat = pack.operational_saturation?.operational || {};
  const adopt = pack.operational_adoption || {};
  const coexist = pack.multi_domain_coexistence || {};

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Metric label="Pilot readiness" value={`${pr.level || '—'} (${pr.score ?? '—'})`} />
      <Metric label="Maturidade" value={mat.maturity_level || '—'} tone="green" />
      <Metric label="Ergonomia" value={erg.ergonomics_score ?? '—'} tone={erg.acceptable ? 'green' : 'amber'} />
      <Metric
        label="Saturação"
        value={sat.operational_saturation_score != null ? `${(sat.operational_saturation_score * 100).toFixed(0)}%` : '—'}
        tone={sat.operational_overload ? 'amber' : 'cyan'}
      />
      <Metric label="Adoção" value={adopt.adoption_score ?? '—'} />
      <Metric label="Coexistência" value={coexist.ok ? 'OK' : 'REVISAR'} tone={coexist.ok ? 'green' : 'amber'} />
    </div>
  );
}
