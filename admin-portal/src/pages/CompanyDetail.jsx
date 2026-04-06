import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/http';
import { useAuth } from '../auth/AuthContext';

export default function CompanyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/companies/${id}`)
      .then((r) => setC(r.company))
      .catch((e) => setErr(e.message));
  }, [id]);

  const copyId = () => {
    navigator.clipboard.writeText(c.company_id);
    alert('company_id copiado.');
  };

  const setStatus = async (tenant_status) => {
    if (!window.confirm(`Definir status "${tenant_status}"?`)) return;
    try {
      const r = await api(`/companies/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ tenant_status })
      });
      setC(r.company);
    } catch (e) {
      alert(e.message);
    }
  };

  if (err) {
    return <p style={{ color: 'var(--red)' }}>{err}</p>;
  }
  if (!c) {
    return <p className="muted">Carregando…</p>;
  }

  const canManage = user?.perfil === 'super_admin' || user?.perfil === 'admin_comercial';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0 }}>{c.razao_social}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={copyId}>
            Copiar company_id
          </button>
          {canManage && (
            <Link to={`/empresas/${id}/editar`} className="btn btn--primary">
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p>
          <strong>company_id:</strong>{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{c.company_id}</span>
        </p>
        <p>
          <strong>Status:</strong> {c.tenant_status}
        </p>
        <p>
          <strong>Plano:</strong> {c.plano}
        </p>
        <p>
          <strong>Usuários contratados:</strong> {c.quantidade_usuarios_contratados ?? '—'}
        </p>
        <p>
          <strong>CNPJ:</strong> {c.cnpj || '—'}
        </p>
        <p>
          <strong>Responsável:</strong> {c.nome_responsavel || '—'} / {c.email_responsavel || '—'} /{' '}
          {c.telefone_responsavel || '—'}
        </p>
        <p>
          <strong>Contrato:</strong> {c.data_inicio_contrato || '—'} → {c.data_fim_contrato || '—'}
        </p>
        <p>
          <strong>Observações:</strong> {c.observacoes || '—'}
        </p>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Criada em: {c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : '—'}
        </p>
      </div>

      {canManage && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Alterar status</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['teste', 'ativo', 'suspenso', 'cancelado'].map((s) => (
              <button key={s} type="button" className="btn" onClick={() => setStatus(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/empresas">← Voltar à lista</Link>
      </p>
    </div>
  );
}
