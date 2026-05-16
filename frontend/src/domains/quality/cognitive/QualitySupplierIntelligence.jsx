import React from 'react';

export default function QualitySupplierIntelligence({ supplier }) {
  if (!supplier || !supplier.ok) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Fornecedor dinâmico</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
        {supplier.supplier_id} · tendência <span style={{ color: supplier.trend === 'worsening' ? 'var(--red)' : 'var(--green)' }}>{supplier.trend}</span>
      </div>
      <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(supplier.base_scorecard || {}, null, 2)}</pre>
    </div>
  );
}
