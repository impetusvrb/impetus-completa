/**
 * IMPETUS - Painel de Validação Organizacional
 * Cadeia: CEO → diretores | Diretor (área) → gerentes | … | coordenador → supervisores
 */
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { roleVerification } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Shield, CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, Loader2, GitCompare } from 'lucide-react';
import './OrganizationalValidationPanel.css';

const FIELD_LABELS = {
  department_id: 'Departamento (ID)',
  functional_area: 'Área funcional',
  hierarchy_level: 'Nível hierárquico',
  role: 'Função',
  area: 'Área (categoria)',
  job_title: 'Cargo / título',
  company_role_id: 'Cargo estrutural (ID)',
  hr_responsibilities: 'Descrição / responsabilidades',
  supervisor_id: 'Supervisor (ID)',
  name: 'Nome',
  email: 'Email'
};

function formatFieldValue(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 220 ? `${s.slice(0, 220)}…` : s;
}

function buildResponsibilitiesText(r) {
  const snapshot = r?.subject_snapshot && typeof r.subject_snapshot === 'object' ? r.subject_snapshot : null;
  const diff = r?.change_diff && typeof r.change_diff === 'object' ? r.change_diff : null;
  const diffNew = diff?.new_values && typeof diff.new_values === 'object' ? diff.new_values : null;
  const direct =
    (r?.responsibilities_text && String(r.responsibilities_text).trim()) ||
    (r?.hr_responsibilities && String(r.hr_responsibilities).trim()) ||
    (r?.descricao && String(r.descricao).trim()) ||
    (snapshot?.hr_responsibilities && String(snapshot.hr_responsibilities).trim()) ||
    (snapshot?.descricao && String(snapshot.descricao).trim()) ||
    (snapshot?.description && String(snapshot.description).trim()) ||
    (snapshot?.responsibilities && String(snapshot.responsibilities).trim()) ||
    (snapshot?.descricao_funcional && String(snapshot.descricao_funcional).trim()) ||
    (snapshot?.what_i_do && String(snapshot.what_i_do).trim()) ||
    (snapshot?.o_que_faz && String(snapshot.o_que_faz).trim()) ||
    (snapshot?.whatDoes && String(snapshot.whatDoes).trim()) ||
    (diffNew?.hr_responsibilities && String(diffNew.hr_responsibilities).trim()) ||
    (diffNew?.descricao && String(diffNew.descricao).trim()) ||
    (diffNew?.description && String(diffNew.description).trim()) ||
    (diffNew?.responsibilities && String(diffNew.responsibilities).trim()) ||
    (diffNew?.descricao_funcional && String(diffNew.descricao_funcional).trim()) ||
    (diffNew?.what_i_do && String(diffNew.what_i_do).trim()) ||
    (diffNew?.o_que_faz && String(diffNew.o_que_faz).trim()) ||
    (diffNew?.whatDoes && String(diffNew.whatDoes).trim());
  if (direct) return direct;
  return 'Descrição não encontrada no cadastro do usuário.';
}

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
      notify.success('Validação aprovada.');
      load();
    } catch (e) {
      notify.error(e?.apiMessage || e?.response?.data?.error || 'Erro ao aprovar');
    }
  };

  const handleReject = async (requestId) => {
    const reason = (rejectReason || '').trim();
    if (reason.length < 3) {
      notify.error('Informe o motivo da reprovação (mínimo 3 caracteres).');
      return;
    }
    try {
      await roleVerification.approveRequest(requestId, false, reason);
      notify.success('Reprovação registrada.');
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (e) {
      notify.error(e?.apiMessage || e?.response?.data?.error || 'Erro ao rejeitar');
    }
  };

  const statusIcon = (u) => {
    if (u.role_verified === true) return <CheckCircle size={18} className="verified" />;
    if (u.role_verification_status === 'rejected') return <XCircle size={18} className="rejected" />;
    if (u.role_verification_status === 'awaiting_structure') return <AlertTriangle size={18} className="pending" />;
    return <Clock size={18} className="pending" />;
  };

  const statusLabel = (u) => {
    const st = (u.role_verification_status || '').toLowerCase();
    if (u.role_verified === true && (st === 'approved' || st === 'verified')) return 'Aprovado';
    if (u.role_verified === true) return 'Aprovado';
    if (st === 'rejected') return 'Reprovado';
    if (st === 'pending_revalidation') return 'Revalidação pendente';
    if (st === 'awaiting_structure') return 'Aguardando estrutura hierárquica';
    if (st === 'pending') return 'Pendente de validação';
    return 'Pendente';
  };

  const renderDiff = (r) => {
    let diff = r.change_diff;
    if (!diff) return null;
    if (typeof diff === 'string') {
      try {
        diff = JSON.parse(diff);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(diff) || diff.length === 0) return null;
    return (
      <div className="ovp-diff">
        <div className="ovp-diff-title">
          <GitCompare size={16} /> Alterações em relação à versão anterior
        </div>
        <ul>
          {diff.map((d, i) => (
            <li key={i}>
              <strong>{FIELD_LABELS[d.field] || d.field}</strong>
              <div className="ovp-diff-row">
                <span className="ovp-diff-old">{formatFieldValue(d.old)}</span>
                <span className="ovp-diff-arrow">→</span>
                <span className="ovp-diff-new">{formatFieldValue(d.new)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Layout>
      <div className="ovp">
        <header className="ovp-header">
          <div className="ovp-title">
            <Shield size={28} />
            <div>
              <h1>Validação Organizacional</h1>
              <p>Validação hierárquica por área: CEO valida diretores; na mesma área, cada nível valida o nível imediatamente abaixo.</p>
            </div>
          </div>
          <button type="button" className="ovp-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} /> Atualizar
          </button>
        </header>

        {suspicious.length > 0 && (
          <section className="ovp-alerts">
            <AlertTriangle size={24} />
            <div>
              <h3>Alertas</h3>
              {suspicious.map((s, i) => (
                <p key={i}>{s.reason} — {s.name} ({s.role})</p>
              ))}
            </div>
          </section>
        )}

        {pendingApprovals.length > 0 && (
          <section className="ovp-pending-section">
            <h3>Solicitações aguardando a sua decisão (apenas o validador hierárquico da área)</h3>
            {pendingApprovals.map((r) => (
              <div key={r.id} className="ovp-pending-card">
                <div className="ovp-pending-body">
                  <div className="ovp-pending-head">
                    <strong>{r.user_name}</strong>
                    <span className={`ovp-badge-type ovp-badge-type--${r.request_type || 'initial'}`}>
                      {r.request_type === 'revalidation' ? 'Revalidação cadastral' : 'Validação inicial'}
                    </span>
                  </div>
                  <div className="ovp-pending-meta">
                    <span><strong>Email:</strong> {r.user_email}</span>
                    <span><strong>Departamento:</strong> {r.department_name || '—'}</span>
                    <span><strong>Função:</strong> {r.user_role || r.requested_role}</span>
                    <span><strong>Nível hierárquico:</strong> {r.hierarchy_level ?? '—'}</span>
                    <span><strong>Área (categoria):</strong> {r.area || '—'}</span>
                    <span><strong>Área funcional:</strong> {r.functional_area || '—'}</span>
                    <span><strong>Cargo estrutural:</strong> {r.structural_role_name || '—'}</span>
                    <span><strong>Título:</strong> {r.job_title || '—'}</span>
                  </div>
                  <div className="ovp-pending-desc">
                    <strong>Descrição do que faz</strong>
                    <p>{buildResponsibilitiesText(r)}</p>
                  </div>
                  {renderDiff(r)}
                  <small className="ovp-pending-date">
                    Pedido em {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}
                  </small>
                </div>
                <div className="ovp-pending-actions">
                  {rejectingId === r.id ? (
                    <>
                      <textarea
                        placeholder="Motivo da reprovação (obrigatório, mín. 3 caracteres)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="ovp-reject-textarea"
                        rows={3}
                      />
                      <div className="ovp-pending-actions-row">
                        <button type="button" className="ovp-btn-reject" onClick={() => handleReject(r.id)}>Confirmar reprovação</button>
                        <button type="button" className="ovp-btn-cancel" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button type="button" className="ovp-btn-approve" onClick={() => handleApprove(r.id)}>Aprovar</button>
                      <button type="button" className="ovp-btn-reject" onClick={() => setRejectingId(r.id)}>Reprovar</button>
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
                  <th>Departamento</th>
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
                    <td colSpan={7} className="ovp-table-empty">
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
                    <td>{u.department_name || '—'}</td>
                    <td>
                      {u.role}
                      {u.structural_role_name ? (
                        <><br /><small className="ovp-muted">{u.structural_role_name}</small></>
                      ) : null}
                    </td>
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
