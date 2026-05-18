import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function ScoreItem({ label, value }) {
  return (
    <div style={{ flex: '1 1 120px', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
        {typeof value === 'number' && value <= 1 ? `${(value * 100).toFixed(1)}%` : typeof value === 'number' ? value.toFixed(2) : String(value ?? '—')}
      </div>
    </div>
  );
}

export default function QualitySupplierIntelligence({ supplier }) {
  if (!supplier || !supplier.ok) return null;
  const trendColor = supplier.trend === 'worsening' ? 'var(--red)' : supplier.trend === 'improving' ? 'var(--green)' : 'var(--text-secondary)';
  const sc = supplier.base_scorecard || {};

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Fornecedor — inteligência dinâmica</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>ID</div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)' }}>{supplier.supplier_id}</div>
        </div>
        <div>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Tendência</div>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: trendColor, textTransform: 'uppercase' }}>
            {supplier.trend || '—'}
          </div>
        </div>
        {sc.defect_rate != null && (
          <div>
            <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Taxa defeitos</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: sc.defect_rate > 0.03 ? 'var(--amber)' : 'var(--green)' }}>
              {(sc.defect_rate * 100).toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {Object.keys(sc).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(sc).filter(([k]) => k !== 'defect_rate').slice(0, 5).map(([k, v]) => (
            <ScoreItem key={k} label={k.replace(/_/g, ' ')} value={v} />
          ))}
        </div>
      )}
    </div>
  );
}
