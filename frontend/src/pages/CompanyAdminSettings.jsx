/**
 * Gestão de conteúdo e políticas da empresa (administração)
 * POPs, política, contatos operacionais — manuais ficam na Biblioteca / Base Estrutural
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Settings, MessageSquare, FileText, Bell, Shield, Phone, Check, Users, Upload, Activity } from 'lucide-react';
import Layout from '../components/Layout';
import { CheckboxField } from '../components/FormField';
import { adminSettings, appImpetus, pulse, tenantAdmins, adminUsers } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { isStrictAdminRole } from '../utils/roleUtils';
import './AdminSettings.css';

const VALID_TABS = ['comunicacao', 'policy', 'pops', 'notification-contacts', 'notifications', 'pulse', 'tenant-admins'];
const TAB_ALIAS = { 'whatsapp-contacts': 'notification-contacts' };

export default function CompanyAdminSettings() {
  const notify = useNotification();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const effectiveTab = TAB_ALIAS[tabFromUrl || ''] || tabFromUrl;
  const initialTab = VALID_TABS.includes(effectiveTab || '') ? effectiveTab : 'comunicacao';
  const [activeTab, setActiveTab] = useState(initialTab);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'comunicacao') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  };

  useEffect(() => {
    if (tabFromUrl === 'manuals') {
      navigate('/app/biblioteca', { replace: true });
    }
  }, [tabFromUrl, navigate]);

  useEffect(() => {
    const effective = TAB_ALIAS[tabFromUrl || ''] || tabFromUrl;
    if (effective && VALID_TABS.includes(effective) && activeTab !== effective) {
      setActiveTab(effective);
    }
  }, [tabFromUrl]);
  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  const isStrictAdmin = isStrictAdminRole(user);
  const showTenantGovernanceTab = !!(user.is_tenant_admin || isStrictAdminRole(user));
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'comunicacao') {
        appImpetus.getStatus().then(s => setConnectionStatus(s.data)).catch(() => {});
      } else if (activeTab === 'pops') {
        const r = await adminSettings.listPops();
        setPops(r.data.pops || []);
      } else if (activeTab === 'policy') {
        const r = await adminSettings.getCompany();
        const company = r.data.company || {};
        setCompanyPolicy(company.company_policy_text || '');
        setPolicyAttachment(company.config?.policy_attachment || null);
      } else if (activeTab === 'notifications') {
        const r = await adminSettings.getNotificationConfig();
        setNotifConfig(r.data.config || notifConfig);
      } else if (activeTab === 'notification-contacts') {
        const r = await adminSettings.listNotificationContacts();
        setWhatsappContacts(r.data?.contacts || []);
      } else if (activeTab === 'pulse' && isStrictAdmin) {
        try {
          const r = await pulse.getAdminSettings();
          setPulseEnabled(!!r.data?.settings?.pulse_enabled);
          setPulseLoadError('');
        } catch (e) {
          const msg = e.response?.data?.error || e.apiMessage || 'Erro ao carregar Impetus Pulse';
          setPulseLoadError(msg);
          notify.error(msg);
        }
      } else if (activeTab === 'tenant-admins' && showTenantGovernanceTab) {
        setTenantGovLoading(true);
        try {
          const [ta, ul] = await Promise.all([
            tenantAdmins.list(),
            adminUsers.list({ limit: 200, active: 'true' })
          ]);
          setTenantAdminList(ta.data?.admins || []);
          setTenantCanManage(!!ta.data?.tenant_admin_can_manage);
          setGovernanceEnabled(ta.data?.governance_enabled !== false);
          setAllUsersPick(ul.data?.users || []);
        } catch (e) {
          console.error(e);
          notify.error(e.response?.data?.error || 'Erro ao carregar governança do tenant');
        } finally {
          setTenantGovLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [pops, setPops] = useState([]);
  const [companyPolicy, setCompanyPolicy] = useState('');
  const [policyAttachment, setPolicyAttachment] = useState(null);
  const [policyUploadMode, setPolicyUploadMode] = useState('replace');
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [notifConfig, setNotifConfig] = useState({ email_enabled: true, whatsapp_enabled: true, failure_alerts: true });
  const [pulseEnabled, setPulseEnabled] = useState(false);
  const [pulseLoadError, setPulseLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tenantAdminList, setTenantAdminList] = useState([]);
  const [tenantGovLoading, setTenantGovLoading] = useState(false);
  const [tenantCanManage, setTenantCanManage] = useState(false);
  const [governanceEnabled, setGovernanceEnabled] = useState(true);
  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoteType, setPromoteType] = useState('secondary');
  const [allUsersPick, setAllUsersPick] = useState([]);

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await adminSettings.updateNotificationConfig(notifConfig);
      notify.success('Configurações salvas!');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifChange = (e) => {
    const { name, checked } = e.target;
    setNotifConfig(prev => ({ ...prev, [name]: checked }));
  };

  const handleSavePulse = async () => {
    try {
      setSaving(true);
      await pulse.putAdminSettings({ pulse_enabled: pulseEnabled });
      notify.success('Impetus Pulse atualizado.');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePop = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    fd.append('compliance_required', 'false');
    try {
      setSaving(true);
      await adminSettings.createPop(fd);
      notify.success('POP criado!');
      form.reset();
      loadData();
    } catch (err) {
      notify.error(err.apiMessage || err.response?.data?.error || 'Erro ao criar POP');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    try {
      setSaving(true);
      await adminSettings.updateCompany({ company_policy_text: companyPolicy });
      notify.success('Política da empresa salva! A IA usará este conteúdo nas sugestões.');
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPolicy = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.file?.files?.[0]) {
      notify.warning('Selecione um arquivo (PDF, DOC, DOCX ou TXT)');
      return;
    }
    const fd = new FormData(form);
    fd.set('mode', policyUploadMode);
    try {
      setSaving(true);
      const r = await adminSettings.uploadCompanyPolicy(fd);
      setCompanyPolicy(r.data.company_policy_text || '');
      setPolicyAttachment(r.data.policy_attachment || null);
      notify.success(r.data.message || 'Documento importado com sucesso.');
      form.reset();
    } catch (err) {
      notify.error(err.apiMessage || err.response?.data?.error || 'Erro ao importar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWhatsappContact = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name?.value?.trim();
    const phone = form.phone?.value?.trim();
    const role = form.role?.value?.trim();
    const sector = form.sector?.value?.trim();
    if (!name || !phone) {
      notify.warning('Nome e telefone são obrigatórios');
      return;
    }
    try {
      setSaving(true);
      const r = await adminSettings.addNotificationContact({ name, phone, role, sector });
      setWhatsappContacts(r.data?.contacts || []);
      notify.success('Contato adicionado! A IA poderá usá-lo para notificações.');
      form.reset();
    } catch (err) {
      notify.error(err.apiMessage || err.response?.data?.error || 'Erro ao adicionar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWhatsappContact = async (id) => {
    try {
      setSaving(true);
      const r = await adminSettings.deleteNotificationContact(id);
      setWhatsappContacts(r.data?.contacts || []);
      notify.success('Contato removido');
    } catch (err) {
      notify.error(err.apiMessage || err.response?.data?.error || 'Erro ao remover');
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteTenantAdmin = async () => {
    if (!promoteUserId) {
      notify.warning('Seleccione um utilizador');
      return;
    }
    try {
      setSaving(true);
      await tenantAdmins.promote({ user_id: promoteUserId, admin_type: promoteType });
      notify.success('Administrador do tenant actualizado.');
      setPromoteUserId('');
      loadData();
    } catch (e) {
      notify.error(e.response?.data?.error || e.apiMessage || 'Erro ao promover');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeTenantAdmin = async (rowId) => {
    if (!window.confirm('Revogar este administrador de tenant? (O utilizador permanece na empresa.)')) return;
    try {
      setSaving(true);
      await tenantAdmins.revoke(rowId);
      notify.success('Registo revogado.');
      loadData();
    } catch (e) {
      notify.error(e.response?.data?.error || e.apiMessage || 'Erro ao revogar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="admin-settings-page">
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon"><Settings size={24} /></div>
            <div>
              <h1 className="page-title">Conteúdo da empresa</h1>
              <p className="page-subtitle">Política, POPs e notificações operacionais</p>
            </div>
          </div>
        </div>

        <div className="settings-tabs">
          <button type="button" className={`stab ${activeTab === 'comunicacao' ? 'active' : ''}`} onClick={() => selectTab('comunicacao')}><MessageSquare size={18} /> Comunicação</button>
          <button type="button" className={`stab ${activeTab === 'policy' ? 'active' : ''}`} onClick={() => selectTab('policy')}><Shield size={18} /> Política da Empresa</button>
          <button type="button" className={`stab ${activeTab === 'pops' ? 'active' : ''}`} onClick={() => selectTab('pops')}><FileText size={18} /> POPs</button>
          <button type="button" className={`stab ${activeTab === 'notification-contacts' ? 'active' : ''}`} onClick={() => selectTab('notification-contacts')}><Phone size={18} /> Contatos para Notificações</button>
          <button type="button" className={`stab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => selectTab('notifications')}><Bell size={18} /> Notificações</button>
          {isStrictAdmin && (
            <button type="button" className={`stab ${activeTab === 'pulse' ? 'active' : ''}`} onClick={() => selectTab('pulse')}><Activity size={18} /> Impetus Pulse</button>
          )}
          {showTenantGovernanceTab && (
            <button type="button" className={`stab ${activeTab === 'tenant-admins' ? 'active' : ''}`} onClick={() => selectTab('tenant-admins')}><Users size={18} /> Admins do tenant</button>
          )}
        </div>

        <div className="settings-content">
          {activeTab === 'comunicacao' && (
            <div className="settings-panel">
              <h3>Comunicação (App Impetus)</h3>
              {loading ? <p>Carregando...</p> : (
                <div className="communication-connected">
                  <Check size={48} className="text-success" />
                  <p><strong>Comunicação integrada via App Impetus</strong></p>
                  <p className="form-hint" style={{ marginTop: 8, maxWidth: 480 }}>
                    Todas as funcionalidades (Modo Executivo, TPM, IA Organizacional, tarefas, diagnósticos) utilizam o canal unificado do App Impetus. Não é necessária configuração adicional.
                  </p>
                  {connectionStatus?.channel === 'app_impetus' && (
                    <p style={{ marginTop: 8, color: 'var(--color-success)' }}>Canal ativo e conectado.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="settings-panel">
              <h3>Política e Normas da Empresa</h3>
              <p className="form-hint">A IA integrada sempre consulta este conteúdo para garantir que as sugestões estejam alinhadas às políticas, normas e procedimentos internos da sua empresa.</p>
              {loading ? <p>Carregando...</p> : (
                <>
                  <form onSubmit={handleUploadPolicy} className="policy-upload-form">
                    <label className="form-label">Importar documento de política</label>
                    <p className="form-hint" style={{ marginTop: 0 }}>
                      Envie PDF, DOC, DOCX ou TXT — o texto será extraído automaticamente para a IA consultar.
                    </p>
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="form-file"
                      required
                    />
                    <label className="form-label" style={{ marginTop: 12 }}>Modo de importação</label>
                    <select
                      className="form-input"
                      value={policyUploadMode}
                      onChange={(e) => setPolicyUploadMode(e.target.value)}
                      style={{ maxWidth: 360 }}
                    >
                      <option value="replace">Substituir texto da política</option>
                      <option value="append">Anexar ao texto existente</option>
                    </select>
                    {policyAttachment?.filename && (
                      <p className="form-hint policy-upload-meta">
                        Último arquivo: <strong>{policyAttachment.filename}</strong>
                        {policyAttachment.uploaded_at && (
                          <> — {new Date(policyAttachment.uploaded_at).toLocaleString('pt-BR')}</>
                        )}
                      </p>
                    )}
                    <div className="panel-actions">
                      <button type="submit" className="btn btn-secondary" disabled={saving}>
                        <Upload size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        Importar documento
                      </button>
                    </div>
                  </form>

                  <label className="form-label">Texto da política (POPs gerais, normas de segurança, diretrizes, etc.)</label>
                  <textarea
                    className="form-textarea"
                    rows={12}
                    placeholder="Ex: Normas de segurança NR-12 aplicáveis, procedimentos de bloqueio e etiquetagem, diretrizes de manutenção preventiva..."
                    value={companyPolicy}
                    onChange={e => setCompanyPolicy(e.target.value)}
                  />
                  <div className="panel-actions">
                    <button type="button" className="btn btn-primary" onClick={handleSavePolicy} disabled={saving}>Salvar Política</button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'pops' && (
            <div className="settings-panel">
              <h3>POPs (Procedimentos Operacionais Padrão)</h3>
              <p className="form-hint">Procedimentos operacionais da empresa. A IA prioriza estes documentos ao sugerir ações.</p>
              <form onSubmit={handleCreatePop} className="pop-form">
                <label className="form-label">Título *</label>
                <input type="text" name="title" placeholder="Título do POP" required className="form-input" />
                <label className="form-label">Categoria</label>
                <input type="text" name="category" placeholder="Ex: Produção" className="form-input" />
                <label className="form-label">Conteúdo</label>
                <textarea name="content" rows={4} placeholder="Descrição do procedimento" className="form-textarea" />
                <label className="form-label">Arquivo (PDF)</label>
                <input type="file" name="file" accept=".pdf,.doc,.docx" className="form-file" />
                <button type="submit" className="btn btn-primary" disabled={saving}>Criar POP</button>
              </form>
              <div className="list-section">
                <h4>POPs cadastrados</h4>
                {loading ? <p>Carregando...</p> : pops.length === 0 ? <p>Nenhum POP</p> : (
                  <ul className="simple-list">
                    {pops.map(p => <li key={p.id}>{p.title} - {p.category || '-'}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notification-contacts' && (
            <div className="settings-panel">
              <h3>Contatos para Notificações</h3>
              <p className="form-hint">Contatos que a IA pode usar para notificações (TPM, Modo Executivo, alertas).</p>
              <form onSubmit={handleAddWhatsappContact}>
                <input type="text" name="name" placeholder="Nome" className="form-input" required />
                <input type="text" name="phone" placeholder="Telefone" className="form-input" required />
                <input type="text" name="role" placeholder="Cargo" className="form-input" />
                <input type="text" name="sector" placeholder="Setor" className="form-input" />
                <button type="submit" className="btn btn-primary" disabled={saving}>Adicionar</button>
              </form>
              <ul className="simple-list">
                {whatsappContacts.map(c => (
                  <li key={c.id}>{c.name} - {c.phone} <button type="button" className="btn-link" onClick={() => handleRemoveWhatsappContact(c.id)}>Remover</button></li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-panel">
              <h3>Notificações</h3>
              {loading ? <p>Carregando...</p> : (
                <>
                  <CheckboxField label="Email" name="email_enabled" checked={notifConfig.email_enabled} onChange={handleNotifChange} />
                  <CheckboxField label="Notificações no app" name="whatsapp_enabled" checked={notifConfig.whatsapp_enabled} onChange={handleNotifChange} />
                  <CheckboxField label="Alertas de falha" name="failure_alerts" checked={notifConfig.failure_alerts} onChange={handleNotifChange} />
                  <div className="panel-actions">
                    <button className="btn btn-primary" onClick={handleSaveNotifications} disabled={saving}>Salvar</button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'pulse' && isStrictAdmin && (
            <div className="settings-panel">
              <h3>Impetus Pulse</h3>
              <p className="form-hint">
                Ative o módulo de autoavaliação e inteligência humana. O RH dispara ciclos; colaboradores recebem o pop-up
                &quot;Autoavaliação do Nosso Desempenho&quot; sem item fixo no menu. Defina o supervisor imediato na{' '}
                <strong>Gestão de Usuários</strong> (campo supervisor).
              </p>
              {loading ? (
                <p>Carregando...</p>
              ) : pulseLoadError ? (
                <p className="form-hint" style={{ color: 'var(--red, #ff4040)' }}>{pulseLoadError}</p>
              ) : (
                <>
                  <CheckboxField
                    label="Impetus Pulse ativo para esta empresa"
                    name="pulse_enabled"
                    checked={pulseEnabled}
                    onChange={(e) => setPulseEnabled(e.target.checked)}
                  />
                  <p className="form-hint" style={{ marginTop: 8 }}>
                    Após ativar, o RH gere ciclos em <strong>Impetus Pulse (RH)</strong> no menu lateral.
                  </p>
                  <div className="panel-actions">
                    <button type="button" className="btn btn-primary" onClick={handleSavePulse} disabled={saving}>
                      Salvar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'tenant-admins' && showTenantGovernanceTab && (
            <div className="settings-panel">
              <h3>Governança administrativa do tenant</h3>
              <p className="form-hint">
                Camada independente do cargo organizacional: define quem pode administrar o tenant na plataforma.
                Um supervisor ou colaborador pode ser admin de recuperação ou secundário.
              </p>
              {tenantGovLoading ? (
                <p>Carregando...</p>
              ) : !governanceEnabled ? (
                <p className="form-hint">Governança de tenant desactivada no servidor (IMPETUS_TENANT_ADMIN_GOVERNANCE).</p>
              ) : (
                <>
                  <div className="list-section">
                    <h4>Administradores activos</h4>
                    {tenantAdminList.length === 0 ? (
                      <p className="form-hint">Nenhum registo — execute a migration ou bootstrap no servidor.</p>
                    ) : (
                      <ul className="simple-list">
                        {tenantAdminList.map((row) => (
                          <li key={row.id}>
                            <strong>{row.user_name}</strong> ({row.user_email}) — {row.admin_type}
                            {tenantCanManage && (
                              <button
                                type="button"
                                className="btn-link"
                                style={{ marginLeft: 8 }}
                                onClick={() => handleRevokeTenantAdmin(row.id)}
                                disabled={saving}
                              >
                                Revogar
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {tenantCanManage && (
                    <div className="list-section" style={{ marginTop: 16 }}>
                      <h4>Promover / alterar tipo</h4>
                      <p className="form-hint">Primário: um por empresa. Recuperação: um por empresa (substitui o anterior).</p>
                      <select
                        className="form-input"
                        value={promoteUserId}
                        onChange={(e) => setPromoteUserId(e.target.value)}
                        style={{ maxWidth: 420, marginBottom: 8 }}
                      >
                        <option value="">— Utilizador —</option>
                        {allUsersPick.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) — {u.role}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-input"
                        value={promoteType}
                        onChange={(e) => setPromoteType(e.target.value)}
                        style={{ maxWidth: 220, marginLeft: 8, marginBottom: 8 }}
                      >
                        <option value="secondary">Secundário</option>
                        <option value="recovery">Recuperação</option>
                        <option value="primary">Primário</option>
                      </select>
                      <div className="panel-actions">
                        <button type="button" className="btn btn-primary" onClick={handlePromoteTenantAdmin} disabled={saving}>
                          Aplicar
                        </button>
                      </div>
                    </div>
                  )}
                  {!tenantCanManage && (
                    <p className="form-hint">Apenas o administrador primário ou de recuperação pode promover ou revogar.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

    </Layout>
  );
}
