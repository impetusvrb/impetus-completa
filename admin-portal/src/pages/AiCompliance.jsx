import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiGovernance } from '../api/http';

export default function AiCompliance() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.perfil !== 'super_admin') return;
    apiGovernance('/compliance/overview')
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.message || 'Erro'));
  }, [user?.perfil]);

  if (user?.perfil !== 'super_admin') {
    return (
      <div>
        <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Conformidade (LGPD)</h1>
        <p className="muted">Acesso reservado a super administradores Impetus.</p>
      </div>
    );
  }

  if (err) return <p style={{ color: 'var(--red)' }}>{err}</p>;
  if (!data) return <p className="muted">Carregando…</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>AI Compliance Engine</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Trilha legal e classificação de dados (sem expor PII na UI). Execute a migração SQL em produção.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div className="card">
          <div className="muted" style={{ fontSize: '0.75rem' }}>
            Interações sensíveis (90d)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyan)' }}>
            {data.total_sensitive_interactions}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: '0.75rem' }}>
            Incidentes COMPLIANCE_RISK (365d)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyan)' }}>
            {data.compliance_risk_incidents}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: '0.75rem' }}>
            Eventos de anonimização (90d)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyan)' }}>
            {data.anonymization_events}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Empresas com mais traces sensíveis</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            {(data.top_sensitive_companies || []).map((c) => (
              <li key={c.company_id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                {c.company_name}{' '}
                <span className="muted">({c.sensitive_interactions_90d})</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Distribuição base legal (90d)</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            {Object.entries(data.legal_basis_distribution || {}).map(([k, v]) => (
              <li key={k} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                {k}: <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Tipos de dados detetados (90d)</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
          {Object.entries(data.data_types_detected || {}).map(([k, v]) => (
            <li key={k} style={{ padding: '4px 0' }}>
              <code>{k}</code> — {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
