import React from 'react';
import { useOutletContext } from 'react-router-dom';

export default function SafetyFieldInspectionPage() {
  const ctx = useOutletContext() || {};
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h2 style={{ margin: 0, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-accent)' }}>
        Inspeção de campo SST
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
        Runtime operacional — tenant {ctx.companyId ? String(ctx.companyId).slice(0, 8) : '—'}
      </p>
    </div>
  );
}
