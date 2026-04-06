import React, { useEffect, useState } from 'react';
import { api } from '../api/http';

export default function Logs() {
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api(`/logs?page=${page}&limit=40`)
      .then(setRes)
      .catch((e) => setErr(e.message));
  }, [page]);

  if (err) {
    return <p style={{ color: 'var(--red)' }}>{err}</p>;
  }
  if (!res) {
    return <p className="muted">Carregando…</p>;
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Logs administrativos</h1>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Data</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Usuário</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {(res.data || []).map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  {new Date(l.created_at).toLocaleString('pt-BR')}
                </td>
                <td>{l.acao}</td>
                <td>
                  {l.entidade} {l.entidade_id ? `(${l.entidade_id})` : ''}
                </td>
                <td>{l.admin_nome || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{l.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <span>
          Página {page} / {res.pagination?.totalPages || 1}
        </span>
        <button type="button" className="btn" disabled={page >= (res.pagination?.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>
          Próxima
        </button>
      </div>
    </div>
  );
}
