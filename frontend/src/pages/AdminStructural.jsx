/**
 * ADMIN - BASE ESTRUTURAL DA EMPRESA
 * Central de cadastro mestre para alimentar a Impetus IA
 */

import React, { useState, useEffect } from 'react';
import {
  Building2, Briefcase, Factory, Cpu, GitBranch, Package, BarChart3,
  AlertTriangle, MessageSquare, ClipboardList, Clock, UserCheck, Brain,
  Plus, Edit, Trash2, ChevronRight
} from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { adminStructural } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminStructural.css';

const MODULES = [
  { id: 'company-data', label: 'Dados da Empresa', icon: Building2 },
  { id: 'roles', label: 'Cargos e Hierarquia', icon: Briefcase },
  { id: 'lines', label: 'Linhas de Produção', icon: Factory },
  { id: 'assets', label: 'Máquinas e Ativos', icon: Cpu },
  { id: 'processes', label: 'Processos', icon: GitBranch },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'indicators', label: 'Metas e Indicadores', icon: BarChart3 },
  { id: 'failure-risks', label: 'Falhas e Riscos', icon: AlertTriangle },
  { id: 'communication-rules', label: 'Regras de Comunicação', icon: MessageSquare },
  { id: 'routines', label: 'Rotinas e Checklists', icon: ClipboardList },
  { id: 'shifts', label: 'Turnos', icon: Clock },
  { id: 'area-responsibles', label: 'Responsáveis por Área', icon: UserCheck },
  { id: 'ai-config', label: 'Configurações IA', icon: Brain }
];

export default function AdminStructural() {
  const notify = useNotification();
  const [activeModule, setActiveModule] = useState('company-data');
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState(null);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const r = await adminStructural.getReferences();
      setReferences(r.data?.data || null);
    } catch (e) {
      console.error('Erro ao carregar referências:', e);
    }
  };

  return (
    <Layout>
      <div className="admin-structural-page">
        <div className="structural-header">
          <div className="header-left">
            <div className="page-icon">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="page-title">Base Estrutural da Empresa</h1>
              <p className="page-subtitle">Cadastro mestre para alimentar a Impetus IA</p>
            </div>
          </div>
        </div>

        <div className="structural-layout">
          <aside className="structural-sidebar">
            {MODULES.map((m) => (
              <button
                key={m.id}
                className={`sidebar-item ${activeModule === m.id ? 'active' : ''}`}
                onClick={() => setActiveModule(m.id)}
              >
                <m.icon size={18} />
                <span>{m.label}</span>
                <ChevronRight size={16} className="chevron" />
              </button>
            ))}
          </aside>

          <main className="structural-content">
            {activeModule === 'company-data' && <CompanyDataModule loadRefs={loadReferences} />}
            {activeModule === 'roles' && <CrudModule refs={references} module="roles" entityLabel="Cargo" api={adminStructural.roles} columns={[{ key: 'name', label: 'Cargo' }, { key: 'hierarchy_level', label: 'Nível' }, { key: 'work_area', label: 'Área' }]} loadRefs={loadReferences} />}
            {activeModule === 'lines' && <LinesModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'assets' && <CrudModule refs={references} module="assets" entityLabel="Ativo" api={adminStructural.assets} columns={[{ key: 'name', label: 'Ativo' }, { key: 'code_patrimonial', label: 'Código' }, { key: 'department_name', label: 'Setor' }]} loadRefs={loadReferences} />}
            {activeModule === 'processes' && <CrudModule refs={references} module="processes" entityLabel="Processo" api={adminStructural.processes} columns={[{ key: 'name', label: 'Processo' }, { key: 'category', label: 'Categoria' }, { key: 'responsible_area_name', label: 'Área' }]} loadRefs={loadReferences} />}
            {activeModule === 'products' && <CrudModule refs={references} module="products" entityLabel="Produto" api={adminStructural.products} columns={[{ key: 'name', label: 'Produto' }, { key: 'code', label: 'Código' }, { key: 'line_name', label: 'Linha' }]} loadRefs={loadReferences} />}
            {activeModule === 'indicators' && <CrudModule refs={references} module="indicators" entityLabel="Indicador" api={adminStructural.indicators} columns={[{ key: 'name', label: 'Indicador' }, { key: 'target_value', label: 'Meta' }, { key: 'unit', label: 'Unidade' }]} loadRefs={loadReferences} />}
            {activeModule === 'failure-risks' && <CrudModule refs={references} module="failure-risks" entityLabel="Falha/Risco" api={adminStructural.failureRisks} columns={[{ key: 'name', label: 'Nome' }, { key: 'failure_type', label: 'Tipo' }, { key: 'criticality_level', label: 'Criticidade' }]} loadRefs={loadReferences} />}
            {activeModule === 'communication-rules' && <CrudModule refs={references} module="communication-rules" entityLabel="Regra" api={adminStructural.communicationRules} columns={[{ key: 'subject_type', label: 'Assunto' }, { key: 'priority_level', label: 'Prioridade' }]} loadRefs={loadReferences} />}
            {activeModule === 'routines' && <CrudModule refs={references} module="routines" entityLabel="Rotina" api={adminStructural.routines} columns={[{ key: 'name', label: 'Rotina' }, { key: 'routine_type', label: 'Tipo' }, { key: 'frequency', label: 'Frequência' }]} loadRefs={loadReferences} />}
            {activeModule === 'shifts' && <CrudModule refs={references} module="shifts" entityLabel="Turno" api={adminStructural.shifts} columns={[{ key: 'name', label: 'Turno' }, { key: 'start_time', label: 'Início' }, { key: 'end_time', label: 'Fim' }]} loadRefs={loadReferences} />}
            {activeModule === 'area-responsibles' && <CrudModule refs={references} module="area-responsibles" entityLabel="Responsável" api={adminStructural.areaResponsibles} columns={[{ key: 'area_name', label: 'Área' }, { key: 'main_responsible_name', label: 'Responsável' }]} loadRefs={loadReferences} />}
            {activeModule === 'ai-config' && <CrudModule refs={references} module="ai-config" entityLabel="Configuração" api={adminStructural.aiConfig} columns={[{ key: 'config_key', label: 'Chave' }, { key: 'config_type', label: 'Tipo' }]} loadRefs={loadReferences} />}
          </main>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// MÓDULO: DADOS DA EMPRESA
// ============================================================================

function CompanyDataModule({ loadRefs }) {
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminStructural.getCompanyData();
      const d = r.data?.data || {};
      setData(d);
      setForm({
        trade_name: d.trade_name || '',
        subsegment: d.subsegment || '',
        main_unit: d.main_unit || '',
        employee_count: d.employee_count || '',
        shift_count: d.shift_count || '',
        operating_hours: d.operating_hours || '',
        operation_type: d.operation_type || '',
        production_type: d.production_type || '',
        market: d.market || '',
        company_description: d.company_description || '',
        mission: d.mission || '',
        vision: d.vision || '',
        values_text: d.values_text || '',
        internal_policy: d.internal_policy || '',
        operation_rules: d.operation_rules || '',
        organizational_culture: d.organizational_culture || '',
        strategic_notes: d.strategic_notes || ''
      });
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...form, employee_count: form.employee_count ? parseInt(form.employee_count, 10) : null, shift_count: form.shift_count ? parseInt(form.shift_count, 10) : null };
      await adminStructural.updateCompanyData(payload);
      notify.success('Dados atualizados!');
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="module-loading">Carregando...</div>;

  return (
    <div className="company-data-module">
      <p className="module-desc">Informações institucionais e gerais da organização para a Impetus IA.</p>
      <div className="form-section">
        <h3>Identificação</h3>
        <div className="form-grid-2">
          <InputField label="Nome fantasia" name="trade_name" value={form.trade_name} onChange={handleChange} />
          <InputField label="Subsegmento" name="subsegment" value={form.subsegment} onChange={handleChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Unidade principal" name="main_unit" value={form.main_unit} onChange={handleChange} />
          <InputField label="Quantidade de funcionários" name="employee_count" type="number" value={form.employee_count} onChange={handleChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Quantidade de turnos" name="shift_count" type="number" value={form.shift_count} onChange={handleChange} />
          <InputField label="Horários de funcionamento" name="operating_hours" value={form.operating_hours} onChange={handleChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Tipo de operação" name="operation_type" value={form.operation_type} onChange={handleChange} />
          <InputField label="Tipo de produção" name="production_type" value={form.production_type} onChange={handleChange} />
        </div>
        <InputField label="Mercado de atuação" name="market" value={form.market} onChange={handleChange} />

        <h3>Estratégia e cultura</h3>
        <TextAreaField label="Descrição geral" name="company_description" value={form.company_description} onChange={handleChange} rows={3} />
        <TextAreaField label="Missão" name="mission" value={form.mission} onChange={handleChange} rows={2} />
        <TextAreaField label="Visão" name="vision" value={form.vision} onChange={handleChange} rows={2} />
        <TextAreaField label="Valores" name="values_text" value={form.values_text} onChange={handleChange} rows={2} />
        <TextAreaField label="Cultura organizacional" name="organizational_culture" value={form.organizational_culture} onChange={handleChange} rows={2} />
        <TextAreaField label="Regras gerais da operação" name="operation_rules" value={form.operation_rules} onChange={handleChange} rows={2} />
        <TextAreaField label="Política interna" name="internal_policy" value={form.internal_policy} onChange={handleChange} rows={2} />
        <TextAreaField label="Observações estratégicas" name="strategic_notes" value={form.strategic_notes} onChange={handleChange} rows={2} />
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO CRUD GENÉRICO
// ============================================================================

function CrudModule({ refs, module, entityLabel, api, columns, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [module]);

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({});
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm(flattenForForm(item));
    setShowModal(true);
  };

  const openDelete = (item) => {
    setEditing(item);
    setShowDelete(true);
  };

  function flattenForForm(item) {
    if (!item) return {};
    const f = {};
    Object.keys(item).forEach((k) => {
      if (typeof item[k] === 'object' && !Array.isArray(item[k]) && item[k] !== null) return;
      f[k] = item[k] ?? '';
    });
    return f;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (editing) {
        await api.update(editing.id, form);
        notify.success(`${entityLabel} atualizado!`);
      } else {
        await api.create(form);
        notify.success(`${entityLabel} criado!`);
      }
      setShowModal(false);
      resetForm();
      load();
      if (loadRefs) loadRefs();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await api.delete(editing.id);
      notify.success(`${entityLabel} removido`);
      setShowDelete(false);
      setEditing(null);
      load();
      if (loadRefs) loadRefs();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao remover');
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = [
    ...columns,
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button className="action-btn edit" onClick={() => openEdit(row)} title="Editar"><Edit size={14} /></button>
          <button className="action-btn delete" onClick={() => openDelete(row)} title="Remover"><Trash2 size={14} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="crud-module">
      <div className="module-header">
        <p className="module-desc">Cadastre {entityLabel.toLowerCase()}s para a Impetus IA contextualizar melhor.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo {entityLabel}</button>
      </div>
      <Table columns={tableColumns} data={items} loading={loading} emptyMessage={`Nenhum ${entityLabel.toLowerCase()} cadastrado`} />

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? `Editar ${entityLabel}` : `Novo ${entityLabel}`} size="medium">
        <GenericForm module={module} form={form} refs={refs} onChange={handleChange} />
        <ModalFooter onCancel={() => { setShowModal(false); resetForm(); }} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover" size="small">
        <p>Deseja remover este registro?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

function GenericForm({ module, form, refs, onChange }) {
  const deptOpts = (refs?.departments || []).map((d) => ({ value: d.id, label: d.name }));
  const lineOpts = (refs?.productionLines || []).map((l) => ({ value: l.id, label: l.name }));
  const processOpts = (refs?.processes || []).map((p) => ({ value: p.id, label: p.name }));
  const userOpts = (refs?.users || []).map((u) => ({ value: u.id, label: u.name }));

  const fields = {
    roles: [<InputField key="n" label="Nome do cargo" name="name" value={form.name} onChange={onChange} required />, <InputField key="hl" label="Nível hierárquico" name="hierarchy_level" type="number" value={form.hierarchy_level} onChange={onChange} />, <InputField key="wa" label="Área de atuação" name="work_area" value={form.work_area} onChange={onChange} />],
    assets: [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="c" label="Código patrimonial" name="code_patrimonial" value={form.code_patrimonial} onChange={onChange} />, <SelectField key="d" label="Setor" name="department_id" value={form.department_id} onChange={onChange} placeholder="Selecione" options={deptOpts} />, <SelectField key="l" label="Linha" name="line_id" value={form.line_id} onChange={onChange} placeholder="Selecione" options={lineOpts} />],
    processes: [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="cat" label="Categoria" name="category" value={form.category} onChange={onChange} />, <SelectField key="d" label="Área responsável" name="responsible_area_id" value={form.responsible_area_id} onChange={onChange} placeholder="Selecione" options={deptOpts} />],
    products: [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="c" label="Código" name="code" value={form.code} onChange={onChange} />, <SelectField key="l" label="Linha" name="line_id" value={form.line_id} onChange={onChange} placeholder="Selecione" options={lineOpts} />],
    indicators: [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="t" label="Meta" name="target_value" value={form.target_value} onChange={onChange} />, <InputField key="u" label="Unidade" name="unit" value={form.unit} onChange={onChange} />],
    'failure-risks': [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="t" label="Tipo" name="failure_type" value={form.failure_type} onChange={onChange} />, <InputField key="c" label="Criticidade" name="criticality_level" value={form.criticality_level} onChange={onChange} />],
    'communication-rules': [<InputField key="s" label="Tipo de assunto" name="subject_type" value={form.subject_type} onChange={onChange} required />, <InputField key="p" label="Nível de prioridade" name="priority_level" value={form.priority_level} onChange={onChange} />],
    routines: [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="t" label="Tipo" name="routine_type" value={form.routine_type} onChange={onChange} />, <InputField key="f" label="Frequência" name="frequency" value={form.frequency} onChange={onChange} />, <SelectField key="r" label="Responsável" name="responsible_id" value={form.responsible_id} onChange={onChange} placeholder="Selecione" options={userOpts} />],
    shifts: [<InputField key="n" label="Nome" name="name" value={form.name} onChange={onChange} required />, <InputField key="st" label="Início (ex: 06:00)" name="start_time" value={form.start_time} onChange={onChange} />, <InputField key="et" label="Fim (ex: 14:00)" name="end_time" value={form.end_time} onChange={onChange} />],
    'area-responsibles': [<InputField key="a" label="Nome da área" name="area_name" value={form.area_name} onChange={onChange} required />, <SelectField key="r" label="Responsável principal" name="main_responsible_id" value={form.main_responsible_id} onChange={onChange} placeholder="Selecione" options={userOpts} />],
    'ai-config': [<InputField key="k" label="Chave" name="config_key" value={form.config_key} onChange={onChange} required />, <TextAreaField key="nt" label="Termos internos (um por linha)" name="internal_terms" value={Array.isArray(form.internal_terms) ? form.internal_terms.join('\n') : (form.internal_terms || '')} onChange={(e) => onChange({ target: { name: 'internal_terms', value: e.target.value.split('\n').filter(Boolean) } })} rows={3} />]
  };

  return <div className="generic-form">{fields[module] || [<InputField key="def" label="Nome" name="name" value={form.name} onChange={onChange} />]}</div>;
}

// ============================================================================
// MÓDULO: LINHAS DE PRODUÇÃO (com máquinas)
// ============================================================================

function LinesModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [form, setForm] = useState({});
  const [machineForm, setMachineForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminStructural.productionLines.list();
      setLines(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const deptOpts = (refs?.departments || []).map((d) => ({ value: d.id, label: d.name }));
  const userOpts = (refs?.users || []).map((u) => ({ value: u.id, label: u.name }));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', department_id: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (line) => {
    setEditing(line);
    setForm({ name: line.name, code: line.code, department_id: line.department_id || '', status: line.status || 'active', description: line.description || '' });
    setShowModal(true);
  };

  const openAddMachine = (line) => {
    setSelectedLine(line);
    setMachineForm({ name: '', code_tag: '', status: 'active' });
    setShowMachineModal(true);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (editing) {
        await adminStructural.productionLines.update(editing.id, form);
        notify.success('Linha atualizada!');
      } else {
        await adminStructural.productionLines.create(form);
        notify.success('Linha criada!');
      }
      setShowModal(false);
      load();
      loadRefs?.();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const handleMachineSubmit = async () => {
    try {
      setSaving(true);
      await adminStructural.productionLines.addMachine(selectedLine.id, machineForm);
      notify.success('Máquina adicionada!');
      setShowMachineModal(false);
      setSelectedLine(null);
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const cols = [
    { key: 'name', label: 'Linha' },
    { key: 'code', label: 'Código' },
    { key: 'department_name', label: 'Setor' },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button className="action-btn" onClick={() => openAddMachine(row)} title="Adicionar máquina">+ Máquina</button>
          <button className="action-btn edit" onClick={() => openEdit(row)}><Edit size={14} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="crud-module">
      <div className="module-header">
        <p className="module-desc">Cadastre linhas de produção e máquinas para a IA entender o fluxo produtivo.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova Linha</button>
      </div>
      <Table columns={cols} data={lines} loading={loading} emptyMessage="Nenhuma linha cadastrada" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Linha' : 'Nova Linha'} size="medium">
        <div className="generic-form">
          <InputField label="Nome" name="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} required />
          <InputField label="Código" name="code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          <SelectField label="Setor" name="department_id" value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} placeholder="Selecione" options={deptOpts} />
          <SelectField label="Status" name="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={[{ value: 'active', label: 'Ativa' }, { value: 'inactive', label: 'Inativa' }]} />
          <TextAreaField label="Descrição" name="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showMachineModal} onClose={() => setShowMachineModal(false)} title={`Máquina - ${selectedLine?.name || ''}`} size="medium">
        <div className="generic-form">
          <InputField label="Nome da máquina" name="name" value={machineForm.name} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} required />
          <InputField label="Código/Tag" name="code_tag" value={machineForm.code_tag} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          <InputField label="Fabricante" name="manufacturer" value={machineForm.manufacturer} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          <InputField label="Modelo" name="model" value={machineForm.model} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
        </div>
        <ModalFooter onCancel={() => setShowMachineModal(false)} onConfirm={handleMachineSubmit} confirmText="Adicionar" confirmLoading={saving} confirmDisabled={!machineForm.name} />
      </Modal>
    </div>
  );
}
