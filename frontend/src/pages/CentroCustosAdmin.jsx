/**
 * IMPETUS - Centro de Custos Industriais (Admin)
 * Cadastro e edição de itens de custo - Máquinas, Linhas, Funcionários, Energia, etc.
 */
import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField } from '../components/FormField';
import { dashboard } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './CentroCustosAdmin.css';

const CATEGORIES = [
  { value: 'maquinas', label: 'Máquinas' },
  { value: 'linhas_producao', label: 'Linhas de produção' },
  { value: 'funcionarios', label: 'Funcionários' },
  { value: 'energia', label: 'Energia' },
  { value: 'materia_prima', label: 'Matéria-prima' },
  { value: 'retrabalho', label: 'Retrabalho' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'custos_fixos', label: 'Custos fixos da empresa' }
];

const emptyForm = {
  name: '',
  sector: '',
  category_id: 'maquinas',
  cost_per_hour: '',
  cost_per_day: '',
  cost_per_month: '',
  cost_per_year: '',
  cost_downtime_per_hour: '',
  cost_production_loss: '',
  cost_rework: '',
  cost_labor_associated: '',
  machine_identifier: '',
  line_identifier: ''
};

function formatMoney(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function CentroCustosAdmin() {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const r = await dashboard.costs.listItems();
      if (r?.data?.ok) setItems(r.data.items || []);
    } catch (e) {
      if (e?.response?.status === 403) setAccessDenied(true);
      else notify.error(e?.apiMessage || 'Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setFormErrors({});
    setSelectedItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      sector: item.sector || '',
      category_id: item.category_id || 'maquinas',
      cost_per_hour: item.cost_per_hour ?? '',
      cost_per_day: item.cost_per_day ?? '',
      cost_per_month: item.cost_per_month ?? '',
      cost_per_year: item.cost_per_year ?? '',
      cost_downtime_per_hour: item.cost_downtime_per_hour ?? '',
      cost_production_loss: item.cost_production_loss ?? '',
      cost_rework: item.cost_rework ?? '',
      cost_labor_associated: item.cost_labor_associated ?? '',
      machine_identifier: item.machine_identifier || '',
      line_identifier: item.line_identifier || ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openDelete = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleSave = async () => {
    const err = {};
    if (!formData.name?.trim()) err.name = 'Nome é obrigatório';
    if (!formData.category_id) err.category_id = 'Categoria é obrigatória';
    setFormErrors(err);
    if (Object.keys(err).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        cost_per_hour: parseFloat(formData.cost_per_hour) || 0,
        cost_per_day: parseFloat(formData.cost_per_day) || 0,
        cost_per_month: parseFloat(formData.cost_per_month) || 0,
        cost_per_year: parseFloat(formData.cost_per_year) || 0,
        cost_downtime_per_hour: parseFloat(formData.cost_downtime_per_hour) || 0,
        cost_production_loss: parseFloat(formData.cost_production_loss) || 0,
        cost_rework: parseFloat(formData.cost_rework) || 0,
        cost_labor_associated: parseFloat(formData.cost_labor_associated) || 0,
        machine_identifier: formData.machine_identifier?.trim() || null,
        line_identifier: formData.line_identifier?.trim() || null
      };
      if (selectedItem?.id) {
        await dashboard.costs.updateItem(selectedItem.id, payload);
        notify.success('Item atualizado com sucesso!');
      } else {
        await dashboard.costs.createItem(payload);
        notify.success('Item criado com sucesso!');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (e) {
      setFormErrors({ submit: e?.apiMessage || 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await dashboard.costs.deleteItem(selectedItem.id);
      notify.success('Item removido.');
      setShowDeleteModal(false);
      setSelectedItem(null);
      load();
    } catch (e) {
      notify.error(e?.apiMessage || 'Erro ao remover');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Nome', render: (v, r) => <span className="cost-name">{v}</span> },
    { key: 'sector', label: 'Setor', render: (v) => v || '-' },
    { key: 'category_label', label: 'Categoria', render: (v) => v || '-' },
    { key: 'cost_per_hour', label: 'Custo/hora', render: (v) => formatMoney(v) },
    { key: 'cost_downtime_per_hour', label: 'Parada/hora', render: (v) => formatMoney(v) },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button className="action-btn edit" onClick={() => openEdit(row)} title="Editar">
            <Edit size={16} />
          </button>
          <button className="action-btn delete" onClick={() => openDelete(row)} title="Remover">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (accessDenied) {
    return (
      <Layout>
        <div className="centro-custos-admin cca-forbidden">
          <div className="cca-forbidden-card">
            <AlertCircle size={48} />
            <h2>Acesso restrito</h2>
            <p>O cadastro de custos industriais é restrito ao Admin do software.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="centro-custos-admin">
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon">
              <DollarSign size={24} />
            </div>
            <div>
              <h1 className="page-title">Centro de Custos Industriais</h1>
              <p className="page-subtitle">Cadastre itens de custo para cálculo de impacto operacional</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} />
            Novo Item
          </button>
        </div>

        <Table
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage="Nenhum item de custo cadastrado. Adicione itens para a IA calcular o impacto financeiro de eventos operacionais."
        />

        <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={selectedItem ? 'Editar Item' : 'Novo Item de Custo'} size="large">
          <CostItemForm formData={formData} formErrors={formErrors} onChange={handleFormChange} />
          {formErrors.submit && <p className="form-error-msg">{formErrors.submit}</p>}
          <ModalFooter
            onCancel={() => setShowModal(false)}
            onConfirm={handleSave}
            confirmText={selectedItem ? 'Salvar' : 'Criar'}
            confirmLoading={saving}
            confirmDisabled={!formData.name?.trim()}
          />
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Remover Item" size="small">
          <div className="delete-confirmation">
            <AlertCircle size={48} color="var(--color-error)" />
            <h3>Remover item de custo?</h3>
            <p>O item <strong>{selectedItem?.name}</strong> será removido.</p>
          </div>
          <ModalFooter onCancel={() => setShowDeleteModal(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
        </Modal>
      </div>
    </Layout>
  );
}

function CostItemForm({ formData, formErrors, onChange }) {
  return (
    <div className="cost-item-form">
      <div className="form-section">
        <h4>Identificação</h4>
        <div className="form-grid-2">
          <InputField label="Nome" name="name" value={formData.name} onChange={onChange} required error={formErrors.name} placeholder="Ex: Prensa Hidráulica 01" />
          <SelectField label="Categoria" name="category_id" value={formData.category_id} onChange={onChange} options={CATEGORIES} required error={formErrors.category_id} />
        </div>
        <div className="form-grid-2">
          <InputField label="Setor" name="sector" value={formData.sector} onChange={onChange} placeholder="Ex: Produção" />
          <InputField label="ID máquina" name="machine_identifier" value={formData.machine_identifier} onChange={onChange} placeholder="Opcional - para vincular eventos" />
        </div>
        <InputField label="ID linha" name="line_identifier" value={formData.line_identifier} onChange={onChange} placeholder="Opcional - para vincular eventos" />
      </div>
      <div className="form-section">
        <h4>Custos operacionais (R$)</h4>
        <div className="form-grid-3">
          <InputField label="Custo/hora" name="cost_per_hour" type="number" step="0.01" value={formData.cost_per_hour} onChange={onChange} placeholder="0" />
          <InputField label="Custo/dia" name="cost_per_day" type="number" step="0.01" value={formData.cost_per_day} onChange={onChange} placeholder="0" />
          <InputField label="Custo/mês" name="cost_per_month" type="number" step="0.01" value={formData.cost_per_month} onChange={onChange} placeholder="0" />
        </div>
        <InputField label="Custo/ano" name="cost_per_year" type="number" step="0.01" value={formData.cost_per_year} onChange={onChange} placeholder="0" />
      </div>
      <div className="form-section">
        <h4>Custos de impacto (paradas, perdas, retrabalho)</h4>
        <div className="form-grid-3">
          <InputField label="Custo parada/hora" name="cost_downtime_per_hour" type="number" step="0.01" value={formData.cost_downtime_per_hour} onChange={onChange} placeholder="0" helperText="Usado em eventos machine_stopped" />
          <InputField label="Perda produção" name="cost_production_loss" type="number" step="0.01" value={formData.cost_production_loss} onChange={onChange} placeholder="0" />
          <InputField label="Retrabalho" name="cost_rework" type="number" step="0.01" value={formData.cost_rework} onChange={onChange} placeholder="0" />
        </div>
        <InputField label="Mão de obra associada" name="cost_labor_associated" type="number" step="0.01" value={formData.cost_labor_associated} onChange={onChange} placeholder="0" />
      </div>
    </div>
  );
}
