import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiGovernance } from '../api/http';

function StatCard({ title, value, hint }) {
  return (
    <div className="card" style={{ minHeight: 88 }}>
      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyan)' }}>{value}</div>
      {hint && (
        <div className="muted" style={{ fontSize: '0.72rem', marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function AiGovernance() {
  const { user } = useAuth();
  const { incidentId } = useParams();
  const [metrics, setMetrics] = useState(null);
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setErr('');
    try {
      const [m, l] = await Promise.all([
        apiGovernance('/ai-incidents/metrics'),
        apiGovernance(`/ai-incidents?page=${page}&limit=50`)
      ]);
      setMetrics(m.data);
      setList(l.data);
    } catch (e) {
      setErr(e.message || 'Erro ao carregar governança');
    }
  }, [page]);

  useEffect(() => {
    if (user?.perfil !== 'super_admin') return;
    load();
  }, [user?.perfil, load]);

  useEffect(() => {
    if (user?.perfil !== 'super_admin' || !incidentId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiGovernance(`/ai-incidents/${encodeURIComponent(incidentId)}`)
      .then((r) => {
        if (!cancelled) setDetail(r.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Erro ao carregar incidente');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.perfil, incidentId]);

  if (user?.perfil !== 'super_admin') {
    return (
      <div>
        <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Governança de IA</h1>
        <p className="muted">Acesso reservado a super administradores Impetus.</p>
      </div>
    );
  }

  if (err && !metrics) {
    return <p style={{ color: 'var(--red)' }}>{err}</p>;
  }

  const proxy = metrics?.ai_accuracy_proxy;
  const flags = metrics?.governance_flags;

  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: '1.35rem' }}>Central de governança — incidentes IA</h1>
      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Visão global multi-tenant, auditoria por trace e sinais de risco (sem alterar a experiência do
        utilizador final).
      </p>

      {flags?.critical_open_incidents > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            borderLeft: '4px solid var(--red)',
            background: 'rgba(255,80,80,0.06)'
          }}
        >
          <strong>Alerta:</strong> {flags.critical_open_incidents} incidente(s) CRITICAL em aberto.
          {(flags.companies_with_high_burst || []).length > 0 && (
            <span className="muted" style={{ marginLeft: 8 }}>
              Picos HIGH 24h em {flags.companies_with_high_burst.length} empresa(s).
            </span>
          )}
        </div>
      )}

      {metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}
        >
          <StatCard title="Total incidentes" value={metrics.total_incidents} />
          <StatCard title="Em aberto" value={metrics.open_incidents} />
          <StatCard title="Últimos 7 dias" value={metrics.incidents_last_7_days} />
          <StatCard
            title="Proxy precisão HITL (30d)"
            value={
              proxy?.rate_accepted != null
                ? `${Math.round(proxy.rate_accepted * 1000) / 10}% aceite`
                : '—'
            }
            hint={
              proxy?.decided_total
                ? `${proxy.accepted} aceites / ${proxy.rejected} rejeitados`
                : 'Sem decisões ACCEPTED/REJECTED no período'
            }
          />
        </div>
      )}

      {metrics?.companies_most_affected?.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Empresas mais afetadas (7 dias)</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
            {metrics.companies_most_affected.map((c) => (
              <li key={c.company_id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                {c.company_name}{' '}
                <span className="muted">({c.incident_count})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Incidentes (prioridade + enriquecimento)</h2>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            Página {page} — máx. 50 por página
          </div>
        </div>
        {!list ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '8px 6px' }}>Prioridade</th>
                  <th style={{ padding: '8px 6px' }}>Empresa</th>
                  <th style={{ padding: '8px 6px' }}>Tipo</th>
                  <th style={{ padding: '8px 6px' }}>Severidade</th>
                  <th style={{ padding: '8px 6px' }}>Estado</th>
                  <th style={{ padding: '8px 6px' }}>HITL</th>
                  <th style={{ padding: '8px 6px' }}>Resumo</th>
                  <th style={{ padding: '8px 6px' }} />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.incident_id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                      {row.priority_tier} / {row.priority_score}
                    </td>
                    <td style={{ padding: '8px 6px' }}>{row.company_name || '—'}</td>
                    <td style={{ padding: '8px 6px' }}>{row.incident_type}</td>
                    <td style={{ padding: '8px 6px' }}>{row.severity}</td>
                    <td style={{ padding: '8px 6px' }}>{row.status}</td>
                    <td style={{ padding: '8px 6px' }}>{row.human_validation_status || '—'}</td>
                    <td style={{ padding: '8px 6px', maxWidth: 280 }} className="muted">
                      {row.summary}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <Link to={`/governanca-ia/${row.incident_id}`}>Auditoria</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn"
                disabled={!list || page * list.page_size >= list.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Seguinte
              </button>
              <span className="muted" style={{ alignSelf: 'center', fontSize: '0.85rem' }}>
                Total: {list.total}
              </span>
            </div>
          </>
        )}
      </div>

      {incidentId && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Linha do tempo / auditoria completa</h2>
          {!detail ? (
            <p className="muted">Carregando detalhe…</p>
          ) : (
            <pre
              style={{
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 480,
                background: 'var(--bg0)',
                padding: 12,
                borderRadius: 6
              }}
            >
              {JSON.stringify(detail, null, 2)}
            </pre>
          )}
          <Link to="/governanca-ia">← Voltar à lista</Link>
        </div>
      )}
    </div>
  );
}
