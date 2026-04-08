import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/http';
import { useAuth } from '../auth/AuthContext';

export default function CompanyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [debugActivationUrl, setDebugActivationUrl] = useState('');

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

  const resendAdminInvite = async () => {
    if (!window.confirm('Reenviar e-mail com link seguro para o administrador criar a senha? (válido 24 h)')) return;
    setInviteMsg('');
    setDebugActivationUrl('');
    setInviteBusy(true);
    try {
      const r = await api(`/companies/${id}/resend-admin-invite`, { method: 'POST' });
      if (r.debug_activation_url) {
        setDebugActivationUrl(r.debug_activation_url);
      }
      if (r.invite_email_sent) {
        setInviteMsg(`Convite enviado para ${r.to}.`);
      } else {
        setInviteMsg(
          r.debug_activation_url
            ? `E-mail não enviado (sem SMTP). Link de desenvolvimento abaixo — defina ADMIN_PORTAL_DEBUG_INVITE_LINK=false em produção. Destino: ${r.to}.`
            : `Token renovado, mas o e-mail não foi enviado — configure SMTP no servidor (SMTP_HOST, SMTP_USER, SMTP_PASS) ou ative ADMIN_PORTAL_DEBUG_INVITE_LINK=true só em dev. Destino: ${r.to}.`
        );
      }
    } catch (e) {
      setInviteMsg(e.message || 'Erro ao reenviar.');
    } finally {
      setInviteBusy(false);
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
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          <strong>Licença:</strong> nível enterprise · usuários ilimitados
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
        {canManage && c.email_responsavel && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle, rgba(0,212,255,0.15))' }}>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
              Primeiro acesso: reenviar o e-mail com o link para <strong>criar senha</strong> (só funciona se o admin ainda não tiver senha).
            </p>
            <button type="button" className="btn btn--primary" disabled={inviteBusy} onClick={resendAdminInvite}>
              {inviteBusy ? 'A enviar…' : 'Reenviar convite ao admin'}
            </button>
            {inviteMsg && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: '0.88rem',
                  color: inviteMsg.startsWith('Convite enviado')
                    ? 'var(--green)'
                    : inviteMsg.startsWith('Token renovado') || inviteMsg.startsWith('E-mail não enviado')
                      ? 'var(--amber)'
                      : 'var(--red)'
                }}
              >
                {inviteMsg}
              </p>
            )}
            {debugActivationUrl && (
              <div style={{ marginTop: 12 }}>
                {debugActivationUrl.includes(':5174') && (
                  <p style={{ color: 'var(--red)', fontSize: '0.82rem', margin: '0 0 8px' }}>
                    Este link usa a porta <strong>5174</strong> (painel admin). Abra na <strong>app cliente</strong> (geralmente{' '}
                    <strong>3000</strong> com PM2/serveDist) ou defina <code>IMPETUS_CLIENT_APP_URL</code> no .env do backend e reenvie.
                  </p>
                )}
                <p className="muted" style={{ fontSize: '0.78rem', margin: '0 0 6px' }}>
                  Link de ativação (dev) — não partilhe
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    readOnly
                    className="input"
                    style={{ flex: '1 1 240px', fontSize: '0.75rem' }}
                    value={debugActivationUrl}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      navigator.clipboard.writeText(debugActivationUrl);
                      alert('Link copiado.');
                    }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
