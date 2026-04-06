import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/http';
import { useAuth } from '../auth/AuthContext';

function badgeClass(st) {
  const m = { teste: 'badge--teste', ativo: 'badge--ativo', suspenso: 'badge--suspenso', cancelado: 'badge--cancelado' };
  return `badge ${m[st] || ''}`;
}

export default function CompaniesList() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  const load = (p = page) => {
    const params = new URLSearchParams({ page: String(p), limit: '15' });
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setErr('');
    api(`/companies?${params}`)
      .then(setRes)
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  const setStatusQuick = async (id, tenant_status) => {
    if (!window.confirm(`Alterar status para "${tenant_status}"?`)) return;
    try {
      await api(`/companies/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ tenant_status })
      });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Empresas</h1>
        {(user?.perfil === 'super_admin' || user?.perfil === 'admin_comercial') && (
          <Link to="/empresas/nova" className="btn btn--primary">
            Nova empresa
          </Link>
        )}
      </div>

      <form onSubmit={search} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '1rem 0' }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar nome, CNPJ, ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="teste">Teste</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button type="submit" className="btn">
          Filtrar
        </button>
      </form>

      {err && <p style={{ color: 'var(--red)' }}>{err}</p>}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Razão social</th>
              <th>CNPJ</th>
              <th>Status</th>
              <th>company_id</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(res?.data || []).map((c) => (
              <tr key={c.company_id}>
                <td>{c.razao_social}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{c.cnpj || '—'}</td>
                <td>
                  <span className={badgeClass(c.tenant_status)}>{c.tenant_status}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', maxWidth: 200 }} title={c.company_id}>
                  {c.company_id?.slice(0, 8)}…
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link to={`/empresas/${c.company_id}`} className="btn" style={{ padding: '0.35rem 0.6rem' }}>
                    Ver
                  </Link>{' '}
                  <Link to={`/empresas/${c.company_id}/editar`} className="btn" style={{ padding: '0.35rem 0.6rem' }}>
                    Editar
                  </Link>{' '}
                  {(user?.perfil === 'super_admin' || user?.perfil === 'admin_comercial') && (
                    <>
                      <button type="button" className="btn" style={{ padding: '0.35rem 0.6rem' }} onClick={() => setStatusQuick(c.company_id, 'ativo')}>
                        Ativar
                      </button>{' '}
                      <button type="button" className="btn" style={{ padding: '0.35rem 0.6rem' }} onClick={() => setStatusQuick(c.company_id, 'suspenso')}>
                        Suspender
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {res?.pagination && (
        <div className="muted" style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span>
            Página {res.pagination.page} / {res.pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={page >= res.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
