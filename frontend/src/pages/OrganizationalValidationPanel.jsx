/**
 * IMPETUS - Painel de Validação Organizacional
 * Lista usuários, cargo, status de verificação, quem aprovou, data
 */
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { roleVerification } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Shield, CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import './OrganizationalValidationPanel.css';

export default function OrganizationalValidationPanel() {
  const notify = useNotification();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [panelMeta, setPanelMeta] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [panelRes, pendingRes] = await Promise.all([
        roleVerification.getPanel(),
        roleVerification.getPendingApprovals().catch(() => ({ data: { requests: [] } }))
      ]);
      const body = panelRes?.data;
      if (body?.ok) {
        setUsers(body.users || []);
        setSuspicious(body.suspicious_alerts || []);
        setPanelMeta(body.meta || null);
      } else {
        setUsers([]);
        setSuspicious([]);
        setPanelMeta(null);
        const err = body?.error || panelRes?.statusText || 'Não foi possível carregar o painel';
        setLoadError(err);
        notify.error(err);
      }
      if (pendingRes?.data?.requests) setPendingApprovals(pendingRes.data.requests);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Erro de rede ao carregar o painel';
      console.warn('Panel load:', e);
      setLoadError(msg);
      notify.error(msg);
      setUsers([]);
      setSuspicious([]);
      setPanelMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      await roleVerification.approveRequest(requestId, true);
      load();
    } catch (e) {
      alert(e?.apiMessage || 'Erro ao aprovar');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await roleVerification.approveRequest(requestId, false, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (e) {
      alert(e?.apiMessage || 'Erro ao rejeitar');
    }
  };

  const statusIcon = (u) => {
    if (u.role_verified === true) return <CheckCircle size={18} className="verified" />;
    if (u.role_verification_status === 'rejected') return <XCircle size={18} className="rejected" />;
    return <Clock size={18} className="pending" />;
  };

  const statusLabel = (u) => {
    if (u.role_verified === true) return 'Verificado';
    if (u.role_verification_status === 'rejected') return 'Rejeitado';
    return 'Pendente';
  };

  return (
    <Layout>
      <div className="ovp">
        <header className="ovp-header">
          <div className="ovp-title">
            <Shield size={28} />
            <div>
              <h1>Validação Organizacional</h1>
              <p>Status de verificação de cargos estratégicos</p>
            </div>
          </div>
          <button className="ovp-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} /> Atualizar
          </button>
        </header>

        {suspicious.length > 0 && (
          <section className="ovp-alerts">
            <AlertTriangle size={24} />
            <div>
              <h3>Alertas da IA</h3>
              {suspicious.map((s, i) => (
                <p key={i}>{s.reason} — {s.name} ({s.role})</p>
              ))}
            </div>
          </section>
        )}

        {pendingApprovals.length > 0 && (
          <section className="ovp-pending-section">
            <h3>Solicitações aguardando sua aprovação</h3>
            {pendingApprovals.map((r) => (
              <div key={r.id} className="ovp-pending-card">
                <div>
                  <strong>{r.user_name}</strong> — {r.user_email}
                  <br />
                  <small>Cargo: {r.requested_role} • Solicitado em {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : ''}</small>
                </div>
                <div className="ovp-pending-actions">
                  {rejectingId === r.id ? (
                    <>
                      <input
                        type="text"
                        placeholder="Motivo da rejeição (opcional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="ovp-reject-input"
                      />
                      <button className="ovp-btn-reject" onClick={() => handleReject(r.id)}>Confirmar rejeição</button>
                      <button onClick={() => setRejectingId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="ovp-btn-approve" onClick={() => handleApprove(r.id)}>Aprovar</button>
                      <button className="ovp-btn-reject" onClick={() => setRejectingId(r.id)}>Rejeitar</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {loadError && !loading && (
          <div className="ovp-banner ovp-banner--error" role="alert">
            {loadError}
          </div>
        )}

        <section className="ovp-table-wrap">
          {loading ? (
            <div className="ovp-loading"><Loader2 size={32} className="spin" /> Carregando...</div>
          ) : (
            <table className="ovp-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Método</th>
                  <th>Quem aprovou</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loadError && (
                  <tr>
                    <td colSpan={6} className="ovp-table-empty">
                      {panelMeta?.empty_reason === 'no_company'
                        ? panelMeta.message
                        : 'Nenhum usuário encontrado para esta empresa. Cadastre usuários em Gestão de Usuários ou verifique se sua conta está vinculada à empresa correta.'}
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className={u.role_verified === true ? '' : 'unverified'}>
                    <td>
                      <strong>{u.name}</strong>
                      <br /><small>{u.email}</small>
                      {u.is_company_root && <span className="ovp-badge-root">Raiz</span>}
                    </td>
                    <td>{u.role}</td>
                    <td>
                      <span className="ovp-status">
                        {statusIcon(u)}
                        {statusLabel(u)}
                      </span>
                    </td>
                    <td>{u.role_verification_method || '-'}</td>
                    <td>{u.verified_by_name || '-'}</td>
                    <td>{u.role_verified_at ? new Date(u.role_verified_at).toLocaleString('pt-BR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  );
}
