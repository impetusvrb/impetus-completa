import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/http';

function StatCard({ title, value, hint }) {
  return (
    <div className="card" style={{ minHeight: 100 }}>
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--cyan)' }}>{value}</div>
      {hint && (
        <div className="muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/dashboard/stats')
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return <p style={{ color: 'var(--red)' }}>{err}</p>;
  }
  if (!data) {
    return <p className="muted">Carregando…</p>;
  }

  const ts = data.stats?.tenant_status || {};

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Dashboard</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Visão geral das empresas clientes e atividade do painel
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <StatCard title="Total de empresas" value={data.stats?.total_companies ?? '—'} />
        <StatCard title="Ativas" value={ts.ativo ?? 0} />
        <StatCard title="Em teste" value={ts.teste ?? 0} />
        <StatCard title="Suspensas" value={ts.suspenso ?? 0} />
        <StatCard title="Canceladas" value={ts.cancelado ?? 0} />
        <StatCard title="Usuários internos" value={data.stats?.active_internal_users ?? '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Empresas recentes</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(data.recent_companies || []).map((c) => (
              <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <Link to={`/empresas/${c.id}`}>{c.razao_social || c.name}</Link>
                <span className="muted" style={{ marginLeft: 8, fontSize: '0.8rem' }}>
                  {c.tenant_status || '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Últimas ações</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            {(data.recent_logs || []).map((l) => (
              <li key={l.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                <span style={{ color: 'var(--cyan)' }}>{l.acao}</span>
                <span className="muted"> — {l.admin_nome || '—'} — </span>
                {new Date(l.created_at).toLocaleString('pt-BR')}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Contratos a vencer (30 dias)</h2>
        {(data.contracts_expiring_soon || []).length === 0 ? (
          <p className="muted">Nenhum nos próximos 30 dias.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.contracts_expiring_soon.map((c) => (
              <li key={c.id}>
                <Link to={`/empresas/${c.id}`}>{c.razao_social || c.name}</Link>
                <span className="muted"> — {c.contract_end_date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
