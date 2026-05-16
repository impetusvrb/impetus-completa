import React from 'react';

export default function QualityGovernanceRolloutPanel({ pack }) {
  const g = pack?.governance;
  if (!g) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Governança de rollout</div>
      <div style={{ fontSize: 13, color: g.rollout_allowed ? 'var(--green)' : 'var(--amber)' }}>
        {g.rollout_allowed ? 'Sem blockers de flags críticos' : `Blockers: ${(g.blockers || []).join(', ')}`}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{(g.governance_hints || []).join(' · ')}</p>
    </div>
  );
}
