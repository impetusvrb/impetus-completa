/**
 * Gestão de Equipes Operacionais (chão de fábrica — login coletivo)
 */
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, UserPlus, BarChart3, AlertTriangle, Download, Building2 } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField, CheckboxField } from '../components/FormField';
import { adminOperationalTeams, adminDepartments, adminStructural } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminOperationalTeams.css';

const emptyTeam = () => ({
  name: '',
  department_id: '',
  company_role_id: '',
  main_shift_label: '',
  description: ''
});

const emptyMember = () => ({
  display_name: '',
  matricula: '',
  sector: '',
  operator_kind: '',
  shift_label: '',
  schedule_start: '',
  schedule_end: '',
  sort_order: 0,
  manual_access_password: '',
  regenerate_access_password: false
});

const operatorKindOpts = [
  { value: '', label: '—' },
  { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'operador', label: 'Operador' }
];

export default function AdminOperationalTeams() {
  const notify = useNotification();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState(emptyTeam());
  const [saving, setSaving] = useState(false);

  const [detailTeam, setDetailTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMember());
  const [editingMember, setEditingMember] = useState(null);

  const [showCollectiveModal, setShowCollectiveModal] = useState(false);
  const [collectiveForm, setCollectiveForm] = useState({ name: '', email: '', password: '' });

  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [teamReport, setTeamReport] = useState([]);
  const [showTeamReport, setShowTeamReport] = useState(false);
  const [plainPasswordModal, setPlainPasswordModal] = useState(null);

  const loadAlerts = async () => {
    try {
      const r = await adminOperationalTeams.healthAlerts();
      setAlerts(r.data?.alerts || []);
    } catch (_) {
      setAlerts([]);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminOperationalTeams.list();
      setTeams(r.data?.teams || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar equipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadAlerts();
    (async () => {
      try {
        const [d, ro] = await Promise.all([adminDepartments.list(), adminStructural.roles.list()]);
        setDepartments(d.data?.departments || []);
        setRoles(ro.data?.data || []);
      } catch (_) {}
    })();
  }, []);

  const deptOpts = [{ value: '', label: '—' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const roleOpts = [{ value: '', label: '—' }, ...roles.map((r) => ({ value: r.id, label: r.name }))];

  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamForm(emptyTeam());
    setShowTeamModal(true);
  };

  const openEditTeam = (row) => {
    setEditingTeam(row);
    setTeamForm({
      name: row.name || '',
      department_id: row.department_id || '',
      company_role_id: row.company_role_id || '',
      main_shift_label: row.main_shift_label || '',
      description: row.description || ''
    });
    setShowTeamModal(true);
  };

  const saveTeam = async () => {
    try {
      setSaving(true);
      const payload = {
        ...teamForm,
        department_id: teamForm.department_id || null,
        company_role_id: teamForm.company_role_id || null
      };
      if (editingTeam) {
        await adminOperationalTeams.update(editingTeam.id, payload);
        notify.success('Equipe atualizada');
      } else {
        await adminOperationalTeams.create(payload);
        notify.success('Equipe criada');
      }
      setShowTeamModal(false);
      load();
      loadAlerts();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (row) => {
    try {
      const r = await adminOperationalTeams.get(row.id);
      setDetailTeam(r.data?.team);
      setMembers(r.data?.members || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao abrir equipe');
    }
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm(emptyMember());
    setShowMemberModal(true);
  };

  const openEditMember = (m) => {
    setEditingMember(m);
    setMemberForm({
      display_name: m.display_name || '',
      matricula: m.matricula || '',
      sector: m.sector || '',
      operator_kind: m.operator_kind || '',
      shift_label: m.shift_label || '',
      schedule_start: m.schedule_start ? String(m.schedule_start).slice(0, 5) : '',
      schedule_end: m.schedule_end ? String(m.schedule_end).slice(0, 5) : '',
      sort_order: m.sort_order ?? 0,
      manual_access_password: '',
      regenerate_access_password: false
    });
    setShowMemberModal(true);
  };

  const saveMember = async () => {
    if (!detailTeam) return;
    if (!editingMember && !String(memberForm.matricula || '').trim()) {
      notify.error('Informe a matrícula.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        display_name: memberForm.display_name,
        matricula: String(memberForm.matricula || '').trim(),
        sector: memberForm.sector || null,
        operator_kind: memberForm.operator_kind || null,
        shift_label: memberForm.shift_label || null,
        schedule_start: memberForm.schedule_start || null,
        schedule_end: memberForm.schedule_end || null,
        sort_order: memberForm.sort_order ?? 0
      };
      const manual = String(memberForm.manual_access_password || '').trim();
      if (manual.length >= 6) {
        payload.access_password = manual;
      }
      if (editingMember) {
        if (memberForm.regenerate_access_password) {
          payload.regenerate_access_password = true;
        }
        const r = await adminOperationalTeams.updateMember(detailTeam.id, editingMember.id, payload);
        notify.success('Membro atualizado');
        if (r.data?.generated_access_password) {
          setPlainPasswordModal(r.data.generated_access_password);
        }
      } else {
        const r = await adminOperationalTeams.createMember(detailTeam.id, payload);
        notify.success('Membro adicionado');
        if (r.data?.generated_access_password) {
          setPlainPasswordModal(r.data.generated_access_password);
        }
      }
      setShowMemberModal(false);
      openDetail(detailTeam);
      loadAlerts();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao salvar membro');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (m) => {
    if (!detailTeam || !window.confirm(`Remover ${m.display_name} da equipe?`)) return;
    try {
      await adminOperationalTeams.deleteMember(detailTeam.id, m.id);
      notify.success('Membro removido');
      openDetail(detailTeam);
      loadAlerts();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    }
  };

  const saveCollective = async () => {
    if (!detailTeam) return;
    try {
      setSaving(true);
      await adminOperationalTeams.createCollectiveUser(detailTeam.id, collectiveForm);
      notify.success('Conta de login coletivo criada. Use o email e senha no login da equipe.');
      setShowCollectiveModal(false);
      setCollectiveForm({ name: '', email: '', password: '' });
      loadAlerts();
    } catch (e) {
      notify.error(e.apiMessage || e.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setSaving(false);
    }
  };

  const loadReport = async () => {
    try {
      const r = await adminOperationalTeams.memberActivityReport(30);
      setReport(r.data?.data || []);
      setShowReport(true);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro no relatório');
    }
  };

  const loadTeamReport = async () => {
    try {
      const r = await adminOperationalTeams.teamActivityReport(30);
      setTeamReport(r.data?.data || []);
      setShowTeamReport(true);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro no relatório por equipe');
    }
  };

  const downloadCsv = async () => {
    try {
      await adminOperationalTeams.downloadMemberEventsCsv(30);
      notify.success('Ficheiro CSV gerado');
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao exportar CSV');
    }
  };

  const columns = [
    { key: 'name', label: 'Equipe' },
    { key: 'main_shift_label', label: 'Turno principal' },
    { key: 'members_count', label: 'Membros' },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button type="button" className="action-btn edit" onClick={() => openEditTeam(row)}>
            <Edit size={14} />
          </button>
          <button type="button" className="action-btn" onClick={() => openDetail(row)}>
            Membros
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="admin-op-teams">
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon">
              <Users size={24} />
            </div>
            <div>
              <h1 className="page-title">Equipes operacionais</h1>
              <p className="page-subtitle">
                Cadastre equipes do chão de fábrica, auxiliares e operadores (matrícula e senha individual), e o login coletivo.
                Cada acesso ao painel exige verificação por matrícula após o login da equipe.
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="btn btn-secondary" onClick={loadReport}>
              <BarChart3 size={16} /> Por membro (30d)
            </button>
            <button type="button" className="btn btn-secondary" onClick={loadTeamReport}>
              <Building2 size={16} /> Por equipe (30d)
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadCsv}>
              <Download size={16} /> CSV eventos
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateTeam}>
              <Plus size={16} /> Nova equipe
            </button>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="admin-op-teams-alerts" role="region" aria-label="Alertas de configuração">
            {alerts.map((a, i) => (
              <div
                key={`${a.type}-${a.team_id}-${i}`}
                className={`admin-op-teams-alert admin-op-teams-alert--${a.severity === 'warning' ? 'warning' : 'info'}`}
              >
                <AlertTriangle size={18} aria-hidden />
                <div>
                  <strong>{a.team_name}</strong>
                  <span className="admin-op-teams-alert-msg">{a.message}</span>
                  {a.members?.length ? (
                    <span className="admin-op-teams-alert-meta">{a.members.join(', ')}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <Table columns={columns} data={teams} loading={loading} emptyMessage="Nenhuma equipe cadastrada" />

        {detailTeam && (
          <div className="op-team-detail">
            <div className="detail-head">
              <h2>{detailTeam.name}</h2>
              <button type="button" className="btn btn-text" onClick={() => setDetailTeam(null)}>
                Fechar
              </button>
            </div>
            <p className="detail-meta">
              Turno: {detailTeam.main_shift_label || '—'} · Membros: {members.filter((m) => m.active).length}
            </p>
            <div className="detail-actions">
              <button type="button" className="btn btn-primary" onClick={openAddMember}>
                <Plus size={16} /> Adicionar membro
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCollectiveForm({ name: detailTeam.name, email: '', password: '' });
                  setShowCollectiveModal(true);
                }}
              >
                <UserPlus size={16} /> Criar login coletivo
              </button>
            </div>
            <ul className="member-list">
              {members
                .filter((m) => m.active !== false)
                .map((m) => (
                  <li key={m.id}>
                    <span className="m-name">{m.display_name}</span>
                    <span className="m-meta">
                      {m.matricula ? `Mat. ${m.matricula}` : 'Sem matrícula'}
                      {m.operator_kind ? ` · ${m.operator_kind}` : ''}
                      {m.sector ? ` · ${m.sector}` : ''}
                      {m.shift_label ? ` · ${m.shift_label}` : ''}
                      {m.schedule_start && m.schedule_end && (
                        <span>
                          {' '}
                          · {String(m.schedule_start).slice(0, 5)}–{String(m.schedule_end).slice(0, 5)}
                        </span>
                      )}
                    </span>
                    <button type="button" className="btn-link" onClick={() => openEditMember(m)}>
                      Editar
                    </button>
                    <button type="button" className="btn-link danger" onClick={() => removeMember(m)}>
                      Remover
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <Modal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} title={editingTeam ? 'Editar equipe' : 'Nova equipe'} size="large">
          <div className="form-grid-2">
            <InputField label="Nome da equipe" name="name" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} required />
            <SelectField label="Turno principal" name="main_shift_label" value={teamForm.main_shift_label} onChange={(e) => setTeamForm({ ...teamForm, main_shift_label: e.target.value })} options={[{ value: '', label: '—' }, { value: 'Turno A', label: 'Turno A' }, { value: 'Turno B', label: 'Turno B' }, { value: 'Turno C', label: 'Turno C' }]} />
          </div>
          <SelectField label="Setor" name="department_id" value={teamForm.department_id} onChange={(e) => setTeamForm({ ...teamForm, department_id: e.target.value })} options={deptOpts} />
          <SelectField label="Cargo (Base Estrutural)" name="company_role_id" value={teamForm.company_role_id} onChange={(e) => setTeamForm({ ...teamForm, company_role_id: e.target.value })} options={roleOpts} />
          <TextAreaField label="Observações" name="description" value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} rows={2} />
          <ModalFooter onCancel={() => setShowTeamModal(false)} onConfirm={saveTeam} confirmText="Salvar" confirmLoading={saving} />
        </Modal>

        <Modal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} title={editingMember ? 'Editar membro' : 'Novo auxiliar / operador'} size="large">
          <InputField
            label="Nome completo"
            name="display_name"
            value={memberForm.display_name}
            onChange={(e) => setMemberForm({ ...memberForm, display_name: e.target.value })}
            required
          />
          <div className="form-grid-2">
            <InputField
              label="Matrícula (única na equipe)"
              name="matricula"
              value={memberForm.matricula}
              onChange={(e) => setMemberForm({ ...memberForm, matricula: e.target.value })}
                           required={!editingMember}
              disabled={!!editingMember && String(editingMember?.matricula || '').trim() !== ''}
            />
            <SelectField
              label="Perfil"
              name="operator_kind"
              value={memberForm.operator_kind}
              onChange={(e) => setMemberForm({ ...memberForm, operator_kind: e.target.value })}
              options={operatorKindOpts}
              placeholder="Selecione"
            />
          </div>
          <div className="form-grid-2">
            <InputField label="Turno / etiqueta" name="shift_label" value={memberForm.shift_label} onChange={(e) => setMemberForm({ ...memberForm, shift_label: e.target.value })} />
            <InputField label="Setor" name="sector" value={memberForm.sector} onChange={(e) => setMemberForm({ ...memberForm, sector: e.target.value })} />
          </div>
          <div className="form-grid-2">
            <InputField label="Início (opcional)" name="schedule_start" type="time" value={memberForm.schedule_start} onChange={(e) => setMemberForm({ ...memberForm, schedule_start: e.target.value })} />
            <InputField label="Fim (opcional)" name="schedule_end" type="time" value={memberForm.schedule_end} onChange={(e) => setMemberForm({ ...memberForm, schedule_end: e.target.value })} />
          </div>
          <InputField label="Ordem na lista" name="sort_order" type="number" value={memberForm.sort_order} onChange={(e) => setMemberForm({ ...memberForm, sort_order: parseInt(e.target.value, 10) || 0 })} />
          {!editingMember ? (
            <InputField
              label="Senha de acesso manual (opcional, mín. 6 caracteres)"
              name="manual_access_password"
              type="password"
              value={memberForm.manual_access_password}
              onChange={(e) => setMemberForm({ ...memberForm, manual_access_password: e.target.value })}
              helperText="Se vazio, será gerada automaticamente: matrícula + 3 caracteres aleatórios."
            />
          ) : (
            <>
              <InputField
                label="Nova senha de acesso (opcional)"
                name="manual_access_password"
                type="password"
                value={memberForm.manual_access_password}
                onChange={(e) => setMemberForm({ ...memberForm, manual_access_password: e.target.value })}
              />
              <CheckboxField
                label="Gerar nova senha automaticamente (matrícula + 3 caracteres)"
                name="regenerate_access_password"
                checked={memberForm.regenerate_access_password}
                onChange={(e) => setMemberForm({ ...memberForm, regenerate_access_password: e.target.checked })}
              />
            </>
          )}
          <ModalFooter onCancel={() => setShowMemberModal(false)} onConfirm={saveMember} confirmText="Salvar" confirmLoading={saving} />
        </Modal>

        <Modal isOpen={showCollectiveModal} onClose={() => setShowCollectiveModal(false)} title="Login coletivo da equipe" size="small">
          <p className="modal-hint">
            Será criado um utilizador <strong>colaborador</strong> exclusivo para esta equipe. Após o login com este email, cada operador confirma a identidade com matrícula e senha individual cadastradas nos membros.
          </p>
          <InputField label="Nome exibido" name="name" value={collectiveForm.name} onChange={(e) => setCollectiveForm({ ...collectiveForm, name: e.target.value })} required />
          <InputField label="Email (login)" name="email" type="email" value={collectiveForm.email} onChange={(e) => setCollectiveForm({ ...collectiveForm, email: e.target.value })} required />
          <InputField label="Senha" name="password" type="password" value={collectiveForm.password} onChange={(e) => setCollectiveForm({ ...collectiveForm, password: e.target.value })} required />
          <ModalFooter onCancel={() => setShowCollectiveModal(false)} onConfirm={saveCollective} confirmText="Criar conta" confirmLoading={saving} />
        </Modal>

        <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="Eventos por membro (30 dias)" size="large">
          <Table
            columns={[
              { key: 'team_name', label: 'Equipe' },
              { key: 'display_name', label: 'Membro' },
              { key: 'event_count', label: 'Eventos' }
            ]}
            data={report || []}
            loading={false}
          />
          <div className="admin-op-teams-report-footer">
            <button type="button" className="btn btn-primary" onClick={() => setShowReport(false)}>
              Fechar
            </button>
          </div>
        </Modal>

        <Modal isOpen={!!plainPasswordModal} onClose={() => setPlainPasswordModal(null)} title="Senha de acesso individual" size="small">
          <p className="modal-hint">Guarde e transmita ao colaborador por um canal seguro. Esta senha não será exibida novamente.</p>
          <pre
            style={{
              background: 'var(--bg-secondary, #1e293b)',
              padding: '1rem',
              borderRadius: 8,
              wordBreak: 'break-all',
              fontSize: '1rem'
            }}
          >
            {plainPasswordModal}
          </pre>
          <ModalFooter
            onCancel={() => setPlainPasswordModal(null)}
            onConfirm={() => setPlainPasswordModal(null)}
            confirmText="Fechar"
          />
        </Modal>

        <Modal isOpen={showTeamReport} onClose={() => setShowTeamReport(false)} title="Eventos por equipe (30 dias)" size="large">
          <Table
            columns={[
              { key: 'team_name', label: 'Equipe' },
              { key: 'event_count', label: 'Eventos' }
            ]}
            data={teamReport || []}
            loading={false}
          />
          <div className="admin-op-teams-report-footer">
            <button type="button" className="btn btn-primary" onClick={() => setShowTeamReport(false)}>
              Fechar
            </button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
