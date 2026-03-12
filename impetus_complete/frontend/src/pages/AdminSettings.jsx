/**
 * CONFIGURAÇÕES DO SISTEMA
 * Comunicação (App Impetus), POPs, Manuais, Notificações
 */

<<<<<<< HEAD
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Settings, MessageSquare, FileText, BookOpen, Bell, Save, Check, X, Shield, Phone, LayoutDashboard, QrCode, Smartphone } from 'lucide-react';
=======
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, MessageSquare, FileText, BookOpen, Bell, Shield, Phone, LayoutDashboard, Check } from 'lucide-react';
>>>>>>> bf61ff5e943abb5f09916447f9bfbb52acf338de
import Layout from '../components/Layout';
import { CheckboxField } from '../components/FormField';
import { adminSettings, appImpetus } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminSettings.css';

const SECTION_LABELS = {
  operational_interactions: 'Interações Operacionais',
  ai_insights: 'Insights IA',
  monitored_points: 'Pontos Monitorados',
  proposals: 'Propostas Pró-Ação',
  trend_chart: 'Gráfico de Tendência',
  points_chart: 'Gráfico Pontos Monitorados',
  insights_list: 'Lista de Insights',
  recent_interactions: 'Interações Recentes',
  smart_summary: 'Resumo Inteligente',
  plc_alerts: 'Alertas PLC',
  kpi_request: 'Solicitar KPIs (IA)',
  communication_panel: 'Painel de Comunicação'
};

const HIERARCHY_LABELS = {
  2: 'Gerente',
  3: 'Coordenador',
  4: 'Supervisor',
  5: 'Colaborador'
};

<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
const VALID_TABS = ['comunicacao', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['app', 'zapi', 'policy', 'pops', 'manuals', 'whatsapp-contacts', 'notifications', 'dashboard-visibility'];
>>>>>>> Stashed changes
=======
const VALID_TABS = ['comunicacao', 'policy', 'pops', 'manuals', 'notification-contacts', 'notifications', 'dashboard-visibility'];
const TAB_ALIAS = { 'whatsapp-contacts': 'notification-contacts' };
>>>>>>> bf61ff5e943abb5f09916447f9bfbb52acf338de

export default function AdminSettings() {
  const notify = useNotification();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'comunicacao';
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const initialTab = VALID_TABS.includes(tabFromUrl || '') ? tabFromUrl : 'app';
>>>>>>> Stashed changes
=======
  const effectiveTab = TAB_ALIAS[tabFromUrl || ''] || tabFromUrl;
  const initialTab = VALID_TABS.includes(effectiveTab || '') ? effectiveTab : 'comunicacao';
>>>>>>> bf61ff5e943abb5f09916447f9bfbb52acf338de
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const effective = TAB_ALIAS[tabFromUrl || ''] || tabFromUrl;
    if (effective && VALID_TABS.includes(effective) && activeTab !== effective) {
      setActiveTab(effective);
    }
  }, [tabFromUrl]);
  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  const canConfigDashboard = (user.hierarchy_level ?? 5) <= 1;
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
      if (activeTab === 'comunicacao') {
        appImpetus.getStatus().then(s => setConnectionStatus(s.data)).catch(() => {});
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
      if (activeTab === 'app') {
        ; // App tab - sem chamada API
      } else if (activeTab === 'zapi') {
        const r = await adminSettings.getZApiConfig();
        if (r.data.config) setZapiConfig(prev => ({ ...prev, ...r.data.config }));
        zapi.getStatus().then(s => setConnectionStatus(s.data)).catch(() => {});
>>>>>>> Stashed changes
      } else if (activeTab === 'pops') {
        const r = await adminSettings.listPops();
        setPops(r.data.pops || []);
      } else if (activeTab === 'manuals') {
        const r = await adminSettings.listManuals();
        setManuals(r.data.manuals || []);
      } else if (activeTab === 'policy') {
        const r = await adminSettings.getCompany();
        setCompanyPolicy(r.data.company?.company_policy_text || '');
      } else if (activeTab === 'notifications') {
        const r = await adminSettings.getNotificationConfig();
        setNotifConfig(r.data.config || notifConfig);
      } else if (activeTab === 'notification-contacts') {
        const r = await adminSettings.listNotificationContacts();
        setWhatsappContacts(r.data?.contacts || []);
      } else if (activeTab === 'dashboard-visibility') {
        const r = await adminSettings.getDashboardVisibilityConfigs();
        setVisibilityConfigs(r.data.configs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [pops, setPops] = useState([]);
  const [manuals, setManuals] = useState([]);
  const [companyPolicy, setCompanyPolicy] = useState('');
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [notifConfig, setNotifConfig] = useState({ email_enabled: true, whatsapp_enabled: true, failure_alerts: true });
  const [visibilityConfigs, setVisibilityConfigs] = useState([]);
  const [saving, setSaving] = useState(false);

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

  const getVisibilityForLevel = (level) => {
    const cfg = visibilityConfigs.find(c => c.hierarchy_level === level);
    const sections = cfg?.sections || {};
    return Object.keys(SECTION_LABELS).reduce((acc, k) => ({
      ...acc,
      [k]: sections[k] !== false
    }), {});
  };

  const handleVisibilityChange = (level, key, value) => {
    const current = getVisibilityForLevel(level);
    const updated = { ...current, [key]: value };
    setVisibilityConfigs(prev => {
      const rest = prev.filter(c => c.hierarchy_level !== level);
      const existing = prev.find(c => c.hierarchy_level === level);
      return [...rest, { hierarchy_level: level, sections: updated, ...existing }];
    });
  };

  const handleSaveVisibility = async (level) => {
    try {
      setSaving(true);
      const sections = getVisibilityForLevel(level);
      await adminSettings.saveDashboardVisibility(level, sections);
      notify.success(`Configuração do nível ${HIERARCHY_LABELS[level]} salva!`);
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

  const handleUploadManual = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.file?.files?.[0]) {
      notify.warning('Selecione um arquivo');
      return;
    }
    const fd = new FormData(form);
    try {
      setSaving(true);
      await adminSettings.uploadManual(fd);
      notify.success('Manual enviado!');
      form.reset();
      loadData();
    } catch (err) {
      notify.error(err.apiMessage || err.response?.data?.error || 'Erro ao enviar');
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
              <h1 className="page-title">Configurações</h1>
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
              <p className="page-subtitle">Comunicação, Documentos, POPs, Manuais e Notificações</p>
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
=======
              <p className="page-subtitle">App Impetus, Documentos, POPs, Manuais e Notificações</p>
>>>>>>> Stashed changes
            </div>
          </div>
        </div>

        <div className="settings-tabs">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
          <button className={`stab ${activeTab === 'comunicacao' ? 'active' : ''}`} onClick={() => setActiveTab('comunicacao')}><MessageSquare size={18} /> Comunicação</button>
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
          <button className={`stab ${activeTab === 'app' ? 'active' : ''}`} onClick={() => setActiveTab('app')}><Smartphone size={18} /> App Impetus</button>
          <button className={`stab ${activeTab === 'zapi' ? 'active' : ''}`} onClick={() => setActiveTab('zapi')}><MessageSquare size={18} /> Z-API</button>
>>>>>>> Stashed changes
          <button className={`stab ${activeTab === 'policy' ? 'active' : ''}`} onClick={() => setActiveTab('policy')}><Shield size={18} /> Política da Empresa</button>
          <button className={`stab ${activeTab === 'pops' ? 'active' : ''}`} onClick={() => setActiveTab('pops')}><FileText size={18} /> POPs</button>
          <button className={`stab ${activeTab === 'manuals' ? 'active' : ''}`} onClick={() => setActiveTab('manuals')}><BookOpen size={18} /> Manuais</button>
          <button className={`stab ${activeTab === 'notification-contacts' ? 'active' : ''}`} onClick={() => setActiveTab('notification-contacts')}><Phone size={18} /> Contatos para Notificações</button>
          <button className={`stab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}><Bell size={18} /> Notificações</button>
          {canConfigDashboard && (
            <button className={`stab ${activeTab === 'dashboard-visibility' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard-visibility')}><LayoutDashboard size={18} /> Visibilidade Dashboard</button>
          )}
        </div>

        <div className="settings-content">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
          {activeTab === 'comunicacao' && (
=======
          {activeTab === 'app' && (
=======
          {activeTab === 'app' && (
=======
          {activeTab === 'app' && (
=======
          {activeTab === 'app' && (
=======
          {activeTab === 'app' && (
=======
          {activeTab === 'app' && (
=======
          {activeTab === 'app' && (
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
            <div className="settings-panel">
              <h3>App Impetus - Comunicação Operacional</h3>
              <p className="form-hint">Todas as comunicações passam pelo App Impetus. Envie e receba texto, áudio e vídeo. A IA analisa automaticamente e gera relatórios.</p>
              <div className="app-mobile-cta">
                <Link to="/m" className="btn btn-primary">
                  <Smartphone size={20} />
                  Abrir App (versão mobile)
                </Link>
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>Acesse <strong>/m</strong> no celular para uma interface simplificada focada em chat.</p>
            </div>
          )}
          {activeTab === 'zapi' && (
>>>>>>> Stashed changes
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
                  <label className="form-label">Texto da política (POPs gerais, normas de segurança, diretrizes, etc.)</label>
                  <textarea
                    className="form-textarea"
                    rows={12}
                    placeholder="Ex: Normas de segurança NR-12 aplicáveis, procedimentos de bloqueio e etiquetagem, diretrizes de manutenção preventiva..."
                    value={companyPolicy}
                    onChange={e => setCompanyPolicy(e.target.value)}
                  />
                  <div className="panel-actions">
                    <button className="btn btn-primary" onClick={handleSavePolicy} disabled={saving}>Salvar Política</button>
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

          {activeTab === 'manuals' && (
            <div className="settings-panel">
              <h3>Manuais Operacionais e de Máquinas</h3>
              <p className="form-hint">Manuais operacionais: procedimentos e processos. Manuais de máquina: equipamentos específicos. A IA usa este conteúdo para sugerir diagnósticos e procedimentos.</p>
              <form onSubmit={handleUploadManual} className="manual-form">
                <label className="form-label">Tipo de Manual *</label>
                <select name="manual_type" required className="form-input">
                  <option value="operacional">Manual Operacional (procedimentos/processos)</option>
                  <option value="maquina">Manual de Máquina (equipamento específico)</option>
                </select>
                <label className="form-label">Tipo de Equipamento / Assunto</label>
                <input type="text" name="equipment_type" placeholder="Ex: Prensa ou Processo X" className="form-input" />
                <label className="form-label">Modelo</label>
                <input type="text" name="model" placeholder="Ex: PR-500" className="form-input" />
                <label className="form-label">Fabricante</label>
                <input type="text" name="manufacturer" placeholder="Ex: Fabricante XYZ" className="form-input" />
                <label className="form-label">Arquivo PDF *</label>
                <input type="file" name="file" accept=".pdf" required className="form-file" />
                <button type="submit" className="btn btn-primary" disabled={saving}>Enviar Manual</button>
              </form>
              <div className="list-section">
                <h4>Manuais</h4>
                {loading ? <p>Carregando...</p> : manuals.length === 0 ? <p>Nenhum manual</p> : (
                  <ul className="simple-list">
                    {manuals.map(m => <li key={m.id}>{m.title || m.equipment_type} - {m.manual_type}</li>)}
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

          {activeTab === 'dashboard-visibility' && canConfigDashboard && (
            <div className="settings-panel">
              <h3>Visibilidade do Dashboard por Nível</h3>
              <p className="settings-panel-desc">Configure quais seções cada nível hierárquico visualiza no Dashboard Inteligente (Gerente a Colaborador).</p>
              {[2, 3, 4, 5].map(level => (
                <div key={level} className="visibility-level-card">
                  <h4>{HIERARCHY_LABELS[level]}</h4>
                  <div className="visibility-checkboxes visibility-checkboxes--grid">
                    {Object.entries(SECTION_LABELS).map(([key, label]) => (
                      <CheckboxField key={key} name={key} label={label} checked={getVisibilityForLevel(level)[key] !== false} onChange={e => handleVisibilityChange(level, key, e.target.checked)} />
                    ))}
                  </div>
                  <button className="btn btn-secondary" onClick={() => handleSaveVisibility(level)} disabled={saving}>Salvar {HIERARCHY_LABELS[level]}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </Layout>
  );
}
