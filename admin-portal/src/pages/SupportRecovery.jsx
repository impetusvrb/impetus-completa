import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/http';
import { useAuth } from '../auth/AuthContext';

const cardStyle = {
  background: 'rgba(15, 26, 40, 0.85)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  padding: '1rem 1.25rem',
  marginBottom: '1rem'
};

export default function SupportRecovery() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCompany = searchParams.get('company') || '';

  const [companyId, setCompanyId] = useState(initialCompany);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [reason, setReason] = useState('');
  const [ticket, setTicket] = useState('');
  const [ownershipNotes, setOwnershipNotes] = useState('');
  const [forceNonOrphan, setForceNonOrphan] = useState(false);

  const [targetUserId, setTargetUserId] = useState('');
  const [adminType, setAdminType] = useState('recovery');

  const syncUrl = useCallback(
    (id) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set('company', id);
      else next.delete('company');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const load = async () => {
    const id = companyId.trim();
    if (!id) {
      setErr('Indique o UUID da empresa (company_id).');
      return;
    }
    setErr('');
    setLoading(true);
    setData(null);
    try {
      const r = await api(`/support-recovery/governance/${id}`);
      setData(r);
      syncUrl(id);
    } catch (e) {
      setErr(e.data?.error || e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialCompany) return;
    setCompanyId(initialCompany);
    const run = async () => {
      setErr('');
      setLoading(true);
      setData(null);
      try {
        const r = await api(`/support-recovery/governance/${initialCompany}`);
        setData(r);
      } catch (e) {
        setErr(e.data?.error || e.message || 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [initialCompany]);

  const createOp = async () => {
    const id = companyId.trim();
    if (!id) return;
    setErr('');
    try {
      await api('/support-recovery/operations', {
        method: 'POST',
        body: JSON.stringify({
          company_id: id,
          recovery_reason: reason,
          ticket_reference: ticket,
          ownership_notes: ownershipNotes || undefined,
          forced_non_orphan: user?.perfil === 'super_admin' ? forceNonOrphan : false
        })
      });
      setReason('');
      setTicket('');
      setOwnershipNotes('');
      setForceNonOrphan(false);
      await load();
    } catch (e) {
      setErr(e.data?.error || e.message);
    }
  };

  const approve = async (opId) => {
    setErr('');
    try {
      await api(`/support-recovery/operations/${opId}/approve`, { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setErr(e.data?.error || e.message);
    }
  };

  const deny = async (opId) => {
    if (!window.confirm('Negar esta operação de recuperação?')) return;
    const r = window.prompt('Motivo (opcional, máx. 500 caracteres):') || '';
    setErr('');
    try {
      await api(`/support-recovery/operations/${opId}/deny`, {
        method: 'POST',
        body: JSON.stringify({ reason: r.slice(0, 500) })
      });
      await load();
    } catch (e) {
      setErr(e.data?.error || e.message);
    }
  };

  const execute = async (opId) => {
    if (!targetUserId) {
      setErr('Seleccione o utilizador alvo.');
      return;
    }
    if (!window.confirm('Executar injecção de administrador? Sessões de ex-gestores serão invalidadas.')) return;
    setErr('');
    try {
      const r = await api(`/support-recovery/operations/${opId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ target_user_id: targetUserId, admin_type: adminType })
      });
      alert(`Concluído. Sessões removidas: ${r.sessions_invalidated ?? 0}.`);
      await load();
    } catch (e) {
      setErr(e.data?.error || e.message);
    }
  };

  const gov = data?.governance;
  const users = data?.company_users || [];
  const recent = data?.recent_operations || [];
  const canForce = user?.perfil === 'super_admin';
  const canExecute = user?.perfil === 'super_admin';
  const featureOn = data?.feature_enabled !== false;
  const allowedHere = user?.perfil === 'super_admin' || user?.perfil === 'admin_suporte';

  if (user && !allowedHere) {
    return (
      <p className="muted">
        Esta consola é exclusiva de <strong>super_admin</strong> e <strong>admin_suporte</strong>.
      </p>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: '0 0 0.35rem', letterSpacing: 1 }}>Recuperação de governança (tenant)</h1>
        <p className="muted" style={{ margin: 0, maxWidth: 720, fontSize: '0.9rem' }}>
          Consola restrita à equipa Impetus: estado de <code>tenant_admins</code>, fluxo dual approval e execução
          auditada. Não expõe dados operacionais do cliente.
        </p>
      </div>

      {!featureOn && (
        <p style={{ color: 'var(--amber)' }}>
          Funcionalidade desactivada no servidor (<code>IMPETUS_SUPPORT_RECOVERY_ENABLED=false</code>).
        </p>
      )}

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}>
          LOCALIZAR TENANT
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: '1 1 280px', minWidth: 200 }}
            placeholder="company_id (UUID)"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          />
          <button type="button" className="btn" onClick={load} disabled={loading}>
            {loading ? 'A carregar…' : 'Carregar estado'}
          </button>
          <Link to="/empresas" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Lista de empresas
          </Link>
        </div>
      </div>

      {err ? (
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>{err}</p>
      ) : null}

      {gov && (
        <>
          <div style={cardStyle}>
            <div
              style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}
            >
              ESTADO
            </div>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong>{gov.company?.name || '—'}</strong>{' '}
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {gov.company?.id}
              </span>
            </p>
            <p style={{ margin: '0 0 0.5rem' }}>
              {gov.is_orphan ? (
                <span className="badge" style={{ background: 'rgba(255, 64, 64, 0.15)', color: 'var(--red)' }}>
                  Tenant órfão (sem primary/recovery operacional)
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(0, 255, 136, 0.12)', color: 'var(--green)' }}>
                  Governança activa (não órfão)
                </span>
              )}
            </p>
            {data?.execute_ttl_minutes != null && (
              <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                TTL pós-aprovação: {data.execute_ttl_minutes} min
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <div
              style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}
            >
              TENANT ADMINS (snapshot)
            </div>
            {gov.tenant_admins?.length ? (
              <table className="data" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Utilizador</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {gov.tenant_admins.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.user_name ? `${row.user_name} · ` : ''}
                        {row.user_email || row.user_id}
                      </td>
                      <td>{row.admin_type}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Sem registos ou lista vazia.
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <div
              style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}
            >
              FUNDADOR / ROOT (contexto ownership)
            </div>
            {gov.founder_users?.length ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {gov.founder_users.map((f) => (
                  <li key={f.id} className="muted">
                    {f.name} — {f.email} {f.active ? '' : '(inactivo)'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Nenhum utilizador com is_company_root neste tenant.
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <div
              style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}
            >
              NOVA OPERAÇÃO (1.º passo — pedido)
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 0 }}>
              Motivo ≥10 caracteres; ticket interno ≥4. Segundo administrador Impetus deve aprovar (dual confirmation).
            </p>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 72, marginBottom: 8 }}
              placeholder="Motivo / contexto (auditoria)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <input
              className="input"
              style={{ width: '100%', marginBottom: 8 }}
              placeholder="Referência ticket (ex. SD-12345)"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
            />
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 48, marginBottom: 8 }}
              placeholder="Notas de validação de ownership (opcional)"
              value={ownershipNotes}
              onChange={(e) => setOwnershipNotes(e.target.value)}
            />
            {canForce && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={forceNonOrphan}
                  onChange={(e) => setForceNonOrphan(e.target.checked)}
                />
                Forçar mesmo se o tenant não estiver órfão (excepção; só super_admin)
              </label>
            )}
            <button type="button" className="btn" onClick={createOp} disabled={!featureOn}>
              Criar operação
            </button>
          </div>

          <div style={cardStyle}>
            <div
              style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}
            >
              EXECUÇÃO (após aprovação)
            </div>
            {!canExecute && (
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
                Apenas <strong>super_admin</strong> pode executar a injecção após aprovação.
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <select
                className="input"
                style={{ flex: '1 1 200px' }}
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                disabled={!canExecute}
              >
                <option value="">— Utilizador alvo (activo no tenant) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} &lt;{u.email}&gt;
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={adminType}
                onChange={(e) => setAdminType(e.target.value)}
                disabled={!canExecute}
              >
                <option value="recovery">recovery (slot recovery)</option>
                <option value="primary">primary (promover primário)</option>
              </select>
            </div>
          </div>

          <div style={cardStyle}>
            <div
              style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)', letterSpacing: 2, fontSize: '0.75rem' }}
            >
              OPERAÇÕES RECENTES
            </div>
            {!recent.length ? (
              <p className="muted" style={{ margin: 0 }}>
                Nenhuma operação registada.
              </p>
            ) : (
              <table className="data" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Criada</th>
                    <th>Estado</th>
                    <th>Ticket</th>
                    <th>Forçada</th>
                    <th>Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((op) => (
                    <tr key={op.id}>
                      <td>{op.created_at ? new Date(op.created_at).toLocaleString() : '—'}</td>
                      <td>{op.status}</td>
                      <td>{op.ticket_reference}</td>
                      <td>{op.forced_non_orphan ? 'sim' : 'não'}</td>
                      <td>
                        {op.status === 'pending_second_approval' &&
                        String(op.requested_by_admin_id) !== String(user?.id) ? (
                          <button type="button" className="btn" style={{ marginRight: 6 }} onClick={() => approve(op.id)}>
                            Aprovar
                          </button>
                        ) : null}
                        {op.status === 'pending_second_approval' &&
                        String(op.requested_by_admin_id) === String(user?.id) ? (
                          <span className="muted">Aguarda outro admin</span>
                        ) : null}
                        {(op.status === 'pending_second_approval' || op.status === 'approved') && (
                          <button type="button" className="btn btn--danger" onClick={() => deny(op.id)}>
                            Negar
                          </button>
                        )}
                        {op.status === 'approved' && canExecute ? (
                          <button type="button" className="btn" style={{ marginLeft: 6 }} onClick={() => execute(op.id)}>
                            Executar
                          </button>
                        ) : null}
                        {op.status === 'approved' && op.execute_deadline ? (
                          <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                            Prazo: {new Date(op.execute_deadline).toLocaleString()}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
