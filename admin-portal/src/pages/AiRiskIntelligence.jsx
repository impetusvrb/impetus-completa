import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiGovernance } from '../api/http';

export default function AiRiskIntelligence() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.perfil !== 'super_admin') return;
    apiGovernance('/risk-intelligence/overview')
      .then((r) => setOverview(r.data))
      .catch((e) => setErr(e.message || 'Erro'));
  }, [user?.perfil]);

  if (user?.perfil !== 'super_admin') {
    return (
      <div>
        <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Inteligência de risco (IA)</h1>
        <p className="muted">Acesso reservado a super administradores Impetus.</p>
      </div>
    );
  }

  if (err) return <p style={{ color: 'var(--red)' }}>{err}</p>;
  if (!overview) return <p className="muted">Carregando…</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>AI Risk Intelligence</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Scores dinâmicos (cache {overview.cache_ttl_ms} ms). Não expostos a utilizadores finais — apenas
        equipa Impetus.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Top utilizadores (proxy de risco)</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            {(overview.top_users || []).map((u) => (
              <li key={`${u.company_id}-${u.user_id}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <strong>{u.user_risk_score}</strong>{' '}
                <span className="muted">
                  {u.user_reputation?.trust_level} · hist {u.user_reputation?.history_score}
                </span>
                <div className="muted" style={{ fontSize: '0.75rem' }}>
                  {u.user_name || u.user_email || String(u.user_id).slice(0, 8)} · empresa{' '}
                  {String(u.company_id).slice(0, 8)}…
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Top empresas</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
            {(overview.top_companies || []).map((c) => (
              <li key={c.company_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <strong>{c.company_risk_score}</strong> {c.company_name}
                <span className="muted" style={{ marginLeft: 8 }}>
                  {c.company_reputation?.trust_level}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, overflow: 'auto' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Evolução (incidentes / pressão de risco proxy)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: 6 }}>Semana (UTC)</th>
              <th style={{ padding: 6 }}>Incidentes</th>
              <th style={{ padding: 6 }}>Severidade média</th>
              <th style={{ padding: 6 }}>Pressão proxy</th>
            </tr>
          </thead>
          <tbody>
            {(overview.timeseries || []).map((row) => (
              <tr key={row.week_start} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: 6 }}>{row.week_start}</td>
                <td style={{ padding: 6 }}>{row.incidents}</td>
                <td style={{ padding: 6 }}>{row.avg_severity_numeric != null ? row.avg_severity_numeric.toFixed(2) : '—'}</td>
                <td style={{ padding: 6 }}>{row.risk_pressure_proxy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
