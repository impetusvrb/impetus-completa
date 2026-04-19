/**
 * ADMIN - BASE ESTRUTURAL DA EMPRESA
 * Central de cadastro mestre para alimentar a Impetus IA
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Factory,
  Cpu,
  GitBranch,
  Package,
  BarChart3,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Clock,
  UserCheck,
  Brain,
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ListTree
} from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { adminStructural, companies } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  StructuralGenericForm,
  structuralItemToForm,
  structuralSerializePayload
} from './adminStructural/StructuralForms';
import './AdminStructural.css';

const MODULES = [
  { id: 'company-data', label: 'Dados da Empresa', icon: Building2 },
  { id: 'roles', label: 'Cargos e Hierarquia', icon: Briefcase },
  { id: 'lines', label: 'Linhas de Produção', icon: Factory },
  { id: 'assets', label: 'Máquinas e Ativos', icon: Cpu },
  { id: 'processes', label: 'Processos', icon: GitBranch },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'knowledge-docs', label: 'Base de Conhecimento', icon: FolderOpen },
  { id: 'indicators', label: 'Metas e Indicadores', icon: BarChart3 },
  { id: 'failure-risks', label: 'Falhas e Riscos', icon: AlertTriangle },
  { id: 'communication-rules', label: 'Regras de Comunicação', icon: MessageSquare },
  { id: 'routines', label: 'Rotinas e Checklists', icon: ClipboardList },
  { id: 'shifts', label: 'Turnos e Jornadas', icon: Clock },
  { id: 'area-responsibles', label: 'Responsáveis por Área', icon: UserCheck },
  { id: 'ai-config', label: 'Configurações IA', icon: Brain }
];

export default function AdminStructural() {
  const notify = useNotification();
  const [activeModule, setActiveModule] = useState('company-data');
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
                type="button"
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
            {activeModule === 'roles' && (
              <CrudModule
                refs={references}
                module="roles"
                entityLabel="Cargo"
                api={adminStructural.roles}
                columns={[
                  { key: 'name', label: 'Cargo' },
                  { key: 'hierarchy_level', label: 'Nível' },
                  { key: 'work_area', label: 'Área' }
                ]}
                loadRefs={loadReferences}
                extraDescription="Em Gestão de Utilizadores, associe cada pessoa ao cargo formal correspondente para a IA e os insights usarem estas descrições com segurança."
              />
            )}
            {activeModule === 'lines' && <LinesModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'assets' && (
              <CrudModule
                refs={references}
                module="assets"
                entityLabel="Ativo"
                api={adminStructural.assets}
                columns={[
                  { key: 'name', label: 'Ativo' },
                  { key: 'code_patrimonial', label: 'Código' },
                  { key: 'department_name', label: 'Setor' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'processes' && (
              <CrudModule
                refs={references}
                module="processes"
                entityLabel="Processo"
                api={adminStructural.processes}
                columns={[
                  { key: 'name', label: 'Processo' },
                  { key: 'category', label: 'Categoria' },
                  { key: 'responsible_area_name', label: 'Área' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'products' && (
              <CrudModule
                refs={references}
                module="products"
                entityLabel="Produto"
                api={adminStructural.products}
                columns={[
                  { key: 'name', label: 'Produto' },
                  { key: 'code', label: 'Código' },
                  { key: 'line_name', label: 'Linha' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'knowledge-docs' && (
              <div className="structural-knowledge-wrap">
                <p className="module-desc">
                  Metadados dos documentos para a IA (complementa ficheiros na{' '}
                  <Link to="/app/biblioteca" className="structural-inline-link">
                    Biblioteca de Arquivos
                  </Link>
                  ). Execute a migração SQL no servidor se a tabela ainda não existir.
                </p>
                <CrudModule
                  refs={references}
                  module="knowledge-docs"
                  entityLabel="Documento"
                  api={adminStructural.knowledgeDocuments}
                  columns={[
                    { key: 'title', label: 'Título' },
                    { key: 'doc_type', label: 'Tipo' },
                    { key: 'category', label: 'Categoria' }
                  ]}
                  loadRefs={loadReferences}
                />
              </div>
            )}
            {activeModule === 'indicators' && (
              <CrudModule
                refs={references}
                module="indicators"
                entityLabel="Indicador"
                api={adminStructural.indicators}
                columns={[
                  { key: 'name', label: 'Indicador' },
                  { key: 'target_value', label: 'Meta' },
                  { key: 'unit', label: 'Unidade' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'failure-risks' && (
              <CrudModule
                refs={references}
                module="failure-risks"
                entityLabel="Falha/Risco"
                api={adminStructural.failureRisks}
                columns={[
                  { key: 'name', label: 'Nome' },
                  { key: 'failure_type', label: 'Tipo' },
                  { key: 'criticality_level', label: 'Criticidade' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'communication-rules' && (
              <CrudModule
                refs={references}
                module="communication-rules"
                entityLabel="Regra"
                api={adminStructural.communicationRules}
                columns={[
                  { key: 'subject_type', label: 'Assunto' },
                  { key: 'priority_level', label: 'Prioridade' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'routines' && (
              <CrudModule
                refs={references}
                module="routines"
                entityLabel="Rotina"
                api={adminStructural.routines}
                columns={[
                  { key: 'name', label: 'Rotina' },
                  { key: 'routine_type', label: 'Tipo' },
                  { key: 'frequency', label: 'Frequência' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'shifts' && (
              <CrudModule
                refs={references}
                module="shifts"
                entityLabel="Turno"
                api={adminStructural.shifts}
                columns={[
                  { key: 'name', label: 'Turno' },
                  { key: 'start_time', label: 'Início' },
                  { key: 'end_time', label: 'Fim' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'area-responsibles' && (
              <CrudModule
                refs={references}
                module="area-responsibles"
                entityLabel="Responsável"
                api={adminStructural.areaResponsibles}
                columns={[
                  { key: 'area_name', label: 'Área' },
                  { key: 'main_responsible_name', label: 'Responsável' }
                ]}
                loadRefs={loadReferences}
              />
            )}
            {activeModule === 'ai-config' && (
              <CrudModule
                refs={references}
                module="ai-config"
                entityLabel="Configuração"
                api={adminStructural.aiConfig}
                columns={[
                  { key: 'config_key', label: 'Chave' },
                  { key: 'config_type', label: 'Tipo' }
                ]}
                loadRefs={loadReferences}
              />
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// MÓDULO: DADOS DA EMPRESA
// ============================================================================

function formatOtherUnits(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return '';
  }
}

function CompanyDataModule({ loadRefs }) {
  const notify = useNotification();
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
      const pm = d.products_manufactured;
      setForm({
        name: d.name || '',
        trade_name: d.trade_name || '',
        industry_segment: d.industry_segment || '',
        subsegment: d.subsegment || '',
        cnpj: d.cnpj || '',
        address: d.address || '',
        city: d.city || '',
        state: d.state || '',
        country: d.country || '',
        main_unit: d.main_unit || '',
        other_units_text: formatOtherUnits(d.other_units),
        employee_count: d.employee_count ?? '',
        shift_count: d.shift_count ?? '',
        operating_hours: d.operating_hours || '',
        operation_type: d.operation_type || '',
        production_type: d.production_type || '',
        products_manufactured_text: Array.isArray(pm) ? pm.join('\n') : pm || '',
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
      try {
        // Fallback para ambientes onde o endpoint /admin/structural/company-data
        // ainda não está totalmente compatível com o schema atual.
        const fallback = await companies.getMe();
        const d = fallback.data?.company || {};
        const pm = d.products_manufactured;
        setForm({
          name: d.name || '',
          trade_name: d.trade_name || '',
          industry_segment: d.industry_segment || '',
          subsegment: d.subsegment || '',
          cnpj: d.cnpj || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          country: d.country || '',
          main_unit: d.main_unit || '',
          other_units_text: formatOtherUnits(d.other_units),
          employee_count: d.employee_count ?? '',
          shift_count: d.shift_count ?? '',
          operating_hours: d.operating_hours || '',
          operation_type: d.operation_type || '',
          production_type: d.production_type || '',
          products_manufactured_text: Array.isArray(pm) ? pm.join('\n') : pm || '',
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
        notify.warning('Base estrutural carregada em modo de compatibilidade.');
      } catch {
      notify.error(e.apiMessage || 'Erro ao carregar dados');
      }
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
      let other_units = null;
      if (form.other_units_text && String(form.other_units_text).trim()) {
        try {
          other_units = JSON.parse(form.other_units_text);
        } catch {
          other_units = { filiais: form.other_units_text };
        }
      }
      const products_manufactured = form.products_manufactured_text
        ? String(form.products_manufactured_text)
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : null;
      const payload = {
        name: form.name || null,
        trade_name: form.trade_name || null,
        industry_segment: form.industry_segment || null,
        subsegment: form.subsegment || null,
        cnpj: form.cnpj || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        main_unit: form.main_unit || null,
        other_units,
        employee_count: form.employee_count !== '' ? parseInt(form.employee_count, 10) : null,
        shift_count: form.shift_count !== '' ? parseInt(form.shift_count, 10) : null,
        operating_hours: form.operating_hours || null,
        operation_type: form.operation_type || null,
        production_type: form.production_type || null,
        products_manufactured,
        market: form.market || null,
        company_description: form.company_description || null,
        mission: form.mission || null,
        vision: form.vision || null,
        values_text: form.values_text || null,
        internal_policy: form.internal_policy || null,
        operation_rules: form.operation_rules || null,
        organizational_culture: form.organizational_culture || null,
        strategic_notes: form.strategic_notes || null
      };
      await adminStructural.updateCompanyData(payload);
      notify.success('Dados atualizados!');
      load();
      loadRefs?.();
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
        <h3>Identificação legal e localização</h3>
        <div className="form-grid-2">
          <InputField label="Nome da empresa (razão social)" name="name" value={form.name} onChange={handleChange} />
          <InputField label="Nome fantasia" name="trade_name" value={form.trade_name} onChange={handleChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Segmento" name="industry_segment" value={form.industry_segment} onChange={handleChange} />
          <InputField label="Subsegmento" name="subsegment" value={form.subsegment} onChange={handleChange} />
        </div>
        <InputField label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} />
        <InputField label="Endereço" name="address" value={form.address} onChange={handleChange} />
        <div className="form-grid-3">
          <InputField label="Cidade" name="city" value={form.city} onChange={handleChange} />
          <InputField label="Estado" name="state" value={form.state} onChange={handleChange} />
          <InputField label="País" name="country" value={form.country} onChange={handleChange} />
        </div>
        <div className="form-grid-2">
          <InputField label="Unidade principal" name="main_unit" value={form.main_unit} onChange={handleChange} />
          <TextAreaField
            label="Outras unidades / filiais (JSON ou texto livre)"
            name="other_units_text"
            value={form.other_units_text}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <h3>Operação</h3>
        <div className="form-grid-2">
          <InputField label="Funcionários (aprox.)" name="employee_count" type="number" value={form.employee_count} onChange={handleChange} />
          <InputField label="Quantidade de turnos" name="shift_count" type="number" value={form.shift_count} onChange={handleChange} />
        </div>
        <InputField label="Horários gerais de funcionamento" name="operating_hours" value={form.operating_hours} onChange={handleChange} />
        <div className="form-grid-2">
          <InputField label="Tipo de operação" name="operation_type" value={form.operation_type} onChange={handleChange} />
          <InputField label="Tipo de produção" name="production_type" value={form.production_type} onChange={handleChange} />
        </div>
        <TextAreaField
          label="Produtos fabricados (um por linha)"
          name="products_manufactured_text"
          value={form.products_manufactured_text}
          onChange={handleChange}
          rows={3}
        />
        <InputField label="Mercado de atuação" name="market" value={form.market} onChange={handleChange} />

        <h3>Estratégia e cultura</h3>
        <TextAreaField label="Descrição geral da empresa" name="company_description" value={form.company_description} onChange={handleChange} rows={3} />
        <TextAreaField label="Missão" name="mission" value={form.mission} onChange={handleChange} rows={2} />
        <TextAreaField label="Visão" name="vision" value={form.vision} onChange={handleChange} rows={2} />
        <TextAreaField label="Valores" name="values_text" value={form.values_text} onChange={handleChange} rows={2} />
        <TextAreaField label="Política interna" name="internal_policy" value={form.internal_policy} onChange={handleChange} rows={2} />
        <TextAreaField label="Regras gerais da operação" name="operation_rules" value={form.operation_rules} onChange={handleChange} rows={2} />
        <TextAreaField label="Cultura organizacional" name="organizational_culture" value={form.organizational_culture} onChange={handleChange} rows={2} />
        <TextAreaField label="Observações estratégicas" name="strategic_notes" value={form.strategic_notes} onChange={handleChange} rows={2} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO CRUD GENÉRICO
// ============================================================================

function CrudModule({ refs, module, entityLabel, api, columns, loadRefs, extraDescription }) {
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
    setForm(structuralItemToForm(module, item));
    setShowModal(true);
  };

  const openDelete = (item) => {
    setEditing(item);
    setShowDelete(true);
  };

  const handleChange = (e) => {
    const t = e.target;
    if (t.type === 'checkbox') {
      setForm((prev) => ({ ...prev, [t.name]: t.checked }));
    } else {
      setForm((prev) => ({ ...prev, [t.name]: t.value }));
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = structuralSerializePayload(module, form);
      if (editing) {
        await api.update(editing.id, payload);
        notify.success(`${entityLabel} atualizado!`);
      } else {
        await api.create(payload);
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
          <button type="button" className="action-btn edit" onClick={() => openEdit(row)} title="Editar">
            <Edit size={14} />
          </button>
          <button type="button" className="action-btn delete" onClick={() => openDelete(row)} title="Remover">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="crud-module">
      <div className="module-header">
        <div>
        <p className="module-desc">Cadastre {entityLabel.toLowerCase()}s para a Impetus IA contextualizar melhor.</p>
          {extraDescription ? <p className="module-desc structural-extra-hint">{extraDescription}</p> : null}
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Novo {entityLabel}
        </button>
      </div>
      <Table columns={tableColumns} data={items} loading={loading} emptyMessage={`Nenhum ${entityLabel.toLowerCase()} cadastrado`} />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editing ? `Editar ${entityLabel}` : `Novo ${entityLabel}`}
        size="large"
      >
        <StructuralGenericForm
          module={module}
          form={form}
          refs={refs}
          onChange={handleChange}
          editingRoleId={module === 'roles' ? editing?.id : undefined}
          roleListItems={module === 'roles' ? items : undefined}
        />
        <ModalFooter
          onCancel={() => {
            setShowModal(false);
            resetForm();
          }}
          onConfirm={handleSubmit}
          confirmText="Salvar"
          confirmLoading={saving}
        />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover" size="small">
        <p>Deseja remover este registro?</p>
        <ModalFooter
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
          confirmText="Sim, remover"
          confirmVariant="danger"
          confirmLoading={saving}
        />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: LINHAS DE PRODUÇÃO (com máquinas)
// ============================================================================

function emptyLineForm() {
  return {
    name: '',
    code: '',
    department_id: '',
    unit_plant: '',
    process_type: '',
    productive_capacity: '',
    status: 'active',
    responsible_id: '',
    description: '',
    main_bottleneck: '',
    critical_point: '',
    operation_time: '',
    criticality_level: '',
    operational_notes: '',
    main_product_id: ''
  };
}

function lineToForm(line) {
  return {
    name: line.name || '',
    code: line.code || '',
    department_id: line.department_id || '',
    unit_plant: line.unit_plant || '',
    process_type: line.process_type || '',
    productive_capacity: line.productive_capacity || '',
    status: line.status || 'active',
    responsible_id: line.responsible_id || '',
    description: line.description || '',
    main_bottleneck: line.main_bottleneck || '',
    critical_point: line.critical_point || '',
    operation_time: line.operation_time || '',
    criticality_level: line.criticality_level || '',
    operational_notes: line.operational_notes || '',
    main_product_id: line.main_product_id || ''
  };
}

function LinesModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showLineMachinesModal, setShowLineMachinesModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [lineDetail, setLineDetail] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [form, setForm] = useState(emptyLineForm());
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
  const productOpts = (refs?.products || []).map((p) => ({ value: p.id, label: p.name || p.code }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyLineForm());
    setShowModal(true);
  };

  const openEdit = (line) => {
    setEditing(line);
    setForm(lineToForm(line));
    setShowModal(true);
  };

  const openLineMachines = async (line) => {
    setSelectedLine(line);
    try {
      const r = await adminStructural.productionLines.getOne(line.id);
      setLineDetail(r.data?.data || null);
      setShowLineMachinesModal(true);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar linha');
    }
  };

  const openAddMachine = (line) => {
    setSelectedLine(line);
    setEditingMachine(null);
    setMachineForm({
      name: '',
      nickname: '',
      code_tag: '',
      function_in_process: '',
      machine_type: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      year: '',
      status: 'active',
      criticality: '',
      flow_order: '',
      department_id: '',
      common_failures: '',
      downtime_impact: '',
      technical_notes: ''
    });
    setShowMachineModal(true);
  };

  const openEditMachine = (machine) => {
    setEditingMachine(machine);
    setMachineForm({
      ...machine,
      year: machine.year != null ? String(machine.year) : '',
      flow_order: machine.flow_order != null ? String(machine.flow_order) : '',
      common_failures: Array.isArray(machine.common_failures) ? machine.common_failures.join('\n') : machine.common_failures || ''
    });
    setShowMachineModal(true);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        department_id: form.department_id || null,
        responsible_id: form.responsible_id || null,
        main_product_id: form.main_product_id || null
      };
      if (editing) {
        await adminStructural.productionLines.update(editing.id, payload);
        notify.success('Linha atualizada!');
      } else {
        await adminStructural.productionLines.create(payload);
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

  const buildMachinePayload = () => {
    const cf = machineForm.common_failures;
    const common_failures =
      typeof cf === 'string' ? cf.split('\n').map((s) => s.trim()).filter(Boolean) : cf || [];
    return {
      name: machineForm.name,
      nickname: machineForm.nickname || null,
      code_tag: machineForm.code_tag || null,
      function_in_process: machineForm.function_in_process || null,
      machine_type: machineForm.machine_type || null,
      manufacturer: machineForm.manufacturer || null,
      model: machineForm.model || null,
      serial_number: machineForm.serial_number || null,
      year: machineForm.year ? parseInt(machineForm.year, 10) : null,
      status: machineForm.status || 'active',
      criticality: machineForm.criticality || null,
      flow_order: machineForm.flow_order !== '' && machineForm.flow_order != null ? parseInt(machineForm.flow_order, 10) : null,
      department_id: machineForm.department_id || null,
      common_failures,
      downtime_impact: machineForm.downtime_impact || null,
      technical_notes: machineForm.technical_notes || null
    };
  };

  const handleMachineSubmit = async () => {
    if (!selectedLine?.id || !machineForm.name) return;
    const wasEdit = !!editingMachine;
    const lineIdForRefresh = selectedLine.id;
    try {
      setSaving(true);
      const payload = buildMachinePayload();
      if (editingMachine) {
        await adminStructural.productionLines.updateMachine(selectedLine.id, editingMachine.id, payload);
        notify.success('Máquina atualizada!');
      } else {
        await adminStructural.productionLines.addMachine(selectedLine.id, payload);
      notify.success('Máquina adicionada!');
      }
      setShowMachineModal(false);
      setEditingMachine(null);
      if (!wasEdit) setSelectedLine(null);
      load();
      loadRefs?.();
      try {
        const r = await adminStructural.productionLines.getOne(lineIdForRefresh);
        setLineDetail(r.data?.data || null);
      } catch (_) {
        /* ignore */
      }
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMachine = async (machine) => {
    if (!selectedLine || !window.confirm('Remover esta máquina da linha?')) return;
    try {
      await adminStructural.productionLines.deleteMachine(selectedLine.id, machine.id);
      notify.success('Máquina removida');
      const r = await adminStructural.productionLines.getOne(selectedLine.id);
      setLineDetail(r.data?.data || null);
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao remover');
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
          <button type="button" className="action-btn" onClick={() => openLineMachines(row)} title="Máquinas da linha">
            <ListTree size={14} /> Máquinas
          </button>
          <button type="button" className="action-btn" onClick={() => openAddMachine(row)} title="Adicionar máquina">
            + Máquina
          </button>
          <button type="button" className="action-btn edit" onClick={() => openEdit(row)}>
            <Edit size={14} />
          </button>
        </div>
      )
    }
  ];

  const machineCols = [
    { key: 'name', label: 'Máquina' },
    { key: 'code_tag', label: 'Tag' },
    { key: 'flow_order', label: 'Ordem' },
    {
      key: 'mach_actions',
      label: 'Ações',
      render: (_, m) => (
        <div className="table-actions">
          <button type="button" className="action-btn edit" onClick={() => openEditMachine(m)}>
            <Edit size={14} />
          </button>
          <button type="button" className="action-btn delete" onClick={() => handleDeleteMachine(m)}>
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="crud-module">
      <div className="module-header">
        <p className="module-desc">Cadastre linhas de produção e máquinas para a IA entender o fluxo produtivo.</p>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nova Linha
        </button>
      </div>
      <Table columns={cols} data={lines} loading={loading} emptyMessage="Nenhuma linha cadastrada" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Linha' : 'Nova Linha'} size="large">
        <div className="generic-form">
          <div className="form-grid-2">
            <InputField label="Nome da linha" name="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} required />
          <InputField label="Código" name="code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <SelectField label="Setor / Departamento" name="department_id" value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={deptOpts} placeholder="Selecione" />
            <InputField label="Unidade / Planta" name="unit_plant" value={form.unit_plant} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <InputField label="Tipo de processo" name="process_type" value={form.process_type} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
            <InputField label="Capacidade produtiva" name="productive_capacity" value={form.productive_capacity} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-2">
          <SelectField label="Status" name="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={[{ value: 'active', label: 'Ativa' }, { value: 'inactive', label: 'Inativa' }]} />
            <SelectField label="Responsável pela linha" name="responsible_id" value={form.responsible_id} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={userOpts} placeholder="Opcional" />
          </div>
          <SelectField label="Produto principal fabricado" name="main_product_id" value={form.main_product_id} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={productOpts} placeholder="Opcional" />
          <TextAreaField label="Descrição" name="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
          <div className="form-grid-2">
            <TextAreaField label="Gargalo principal" name="main_bottleneck" value={form.main_bottleneck} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
            <TextAreaField label="Ponto crítico" name="critical_point" value={form.critical_point} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
          </div>
          <div className="form-grid-2">
            <InputField label="Tempo de operação" name="operation_time" value={form.operation_time} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
            <InputField label="Nível de criticidade" name="criticality_level" value={form.criticality_level} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <TextAreaField label="Observações operacionais" name="operational_notes" value={form.operational_notes} onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal
        isOpen={showLineMachinesModal}
        onClose={() => {
          setShowLineMachinesModal(false);
          setLineDetail(null);
          setSelectedLine(null);
        }}
        title={lineDetail ? `Máquinas — ${lineDetail.name}` : 'Máquinas da linha'}
        size="large"
      >
        {lineDetail?.machines && (
          <Table columns={machineCols} data={lineDetail.machines} loading={false} emptyMessage="Nenhuma máquina nesta linha" />
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowLineMachinesModal(false);
              if (selectedLine) openAddMachine(selectedLine);
            }}
          >
            <Plus size={16} /> Adicionar máquina
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowLineMachinesModal(false);
              setLineDetail(null);
              setSelectedLine(null);
            }}
          >
            Fechar
          </button>
        </div>
      </Modal>

      <Modal isOpen={showMachineModal} onClose={() => setShowMachineModal(false)} title={editingMachine ? 'Editar máquina' : `Nova máquina — ${selectedLine?.name || ''}`} size="large">
        <div className="generic-form">
          <div className="form-grid-2">
          <InputField label="Nome da máquina" name="name" value={machineForm.name} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} required />
            <InputField label="Apelido / nome popular" name="nickname" value={machineForm.nickname} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <InputField label="Código / tag" name="code_tag" value={machineForm.code_tag} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
            <InputField label="Função no processo" name="function_in_process" value={machineForm.function_in_process} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-3">
            <InputField label="Tipo da máquina" name="machine_type" value={machineForm.machine_type} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          <InputField label="Fabricante" name="manufacturer" value={machineForm.manufacturer} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          <InputField label="Modelo" name="model" value={machineForm.model} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-3">
            <InputField label="Nº série" name="serial_number" value={machineForm.serial_number} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
            <InputField label="Ano" name="year" type="number" value={machineForm.year} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
            <InputField label="Ordem no fluxo" name="flow_order" type="number" value={machineForm.flow_order} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <SelectField label="Status" name="status" value={machineForm.status} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={[{ value: 'active', label: 'Ativa' }, { value: 'inactive', label: 'Inativa' }]} />
            <InputField label="Criticidade" name="criticality" value={machineForm.criticality} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} />
          </div>
          <SelectField label="Setor associado" name="department_id" value={machineForm.department_id} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} options={deptOpts} placeholder="Opcional" />
          <TextAreaField label="Falhas comuns (uma por linha)" name="common_failures" value={machineForm.common_failures} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={3} />
          <TextAreaField label="Impacto em caso de parada" name="downtime_impact" value={machineForm.downtime_impact} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
          <TextAreaField label="Observações técnicas" name="technical_notes" value={machineForm.technical_notes} onChange={(e) => setMachineForm((f) => ({ ...f, [e.target.name]: e.target.value }))} rows={2} />
        </div>
        <ModalFooter
          onCancel={() => setShowMachineModal(false)}
          onConfirm={handleMachineSubmit}
          confirmText={editingMachine ? 'Guardar' : 'Adicionar'}
          confirmLoading={saving}
          confirmDisabled={!machineForm.name}
        />
      </Modal>
    </div>
  );
}
