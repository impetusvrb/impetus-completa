import React, { useState } from 'react';
import { API_URL } from '../../../services/api.js';

export default function SafetyGovernanceHub() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function evaluateSampleMatrix() {
    setLoading(true);
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-governance/intelligence/risk-matrix/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          rows: [
            { hazard: 'Queda de nível', severity: 4, probability: 3 },
            { hazard: 'Contato elétrico', severity: 5, probability: 2 }
          ]
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: e?.message || 'request_failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        GHE & Matriz de Risco SST
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 12px' }}>
        Motor determinístico de matriz de risco (severidade × probabilidade). Bounded, multi-tenant.
      </p>
      <button type="button" className="btn" onClick={evaluateSampleMatrix} disabled={loading}>
        {loading ? 'Avaliando…' : 'Avaliar amostra'}
      </button>
      {result && (
        <pre style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
