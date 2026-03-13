/**
 * ADMIN - ALMOXARIFADO INTELIGENTE
 * Cadastros: Categorias, Materiais, Fornecedores, Localizações,
 *            Parâmetros, Movimentações, Saldos, Vínculos
 */

import React, { useState, useEffect } from 'react';
import {
  Package, Tags, Truck, MapPin, Settings, ArrowLeftRight,
  BarChart3, Link2, Plus, Edit, Trash2, ChevronRight
} from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { adminWarehouse } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminWarehouse.css';

const MODULES = [
  { id: 'categories', label: 'Categorias de Materiais', icon: Tags },
  { id: 'materials', label: 'Cadastro de Materiais', icon: Package },
  { id: 'suppliers', label: 'Fornecedores', icon: Truck },
  { id: 'locations', label: 'Localizações de Estoque', icon: MapPin },
  { id: 'params', label: 'Parâmetros de Estoque', icon: Settings },
  { id: 'movements', label: 'Movimentações', icon: ArrowLeftRight },
  { id: 'balances', label: 'Saldos Atuais', icon: BarChart3 },
  { id: 'links', label: 'Vínculos Materiais ↔ Processos', icon: Link2 }
];

const USAGE_TYPES = [
  { value: 'production', label: 'Produção' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'general', label: 'Consumo geral' }
];

const MOVEMENT_TYPES = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'saida', label: 'Saída' },
  { value: 'consumo_producao', label: 'Consumo em produção' },
  { value: 'consumo_manutencao', label: 'Consumo em manutenção' },
  { value: 'ajuste', label: 'Ajuste de inventário' }
];

const LINK_TYPES = [
  { value: 'production', label: 'Produção' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'service_order', label: 'Ordem de serviço' },
  { value: 'operational', label: 'Operacional' }
];

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Horária' },
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' }
];

export default function AdminWarehouse() {
  const [activeModule, setActiveModule] = useState('categories');
  const [references, setReferences] = useState(null);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const r = await adminWarehouse.getReferences();
      setReferences(r.data?.data || null);
    } catch (e) {
      console.error('Erro ao carregar referências:', e);
    }
  };

  return (
    <Layout>
      <div className="admin-warehouse-page">
        <div className="warehouse-header">
          <div className="header-left">
            <div className="page-icon">
              <Package size={24} />
            </div>
            <div>
              <h1 className="page-title">Almoxarifado Inteligente</h1>
              <p className="page-subtitle">Cadastros administrativos para rastreabilidade e análises de IA</p>
            </div>
          </div>
        </div>

        <div className="warehouse-layout">
          <aside className="warehouse-sidebar">
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

          <main className="warehouse-content">
            {activeModule === 'categories' && <CategoriesModule loadRefs={loadReferences} />}
            {activeModule === 'materials' && <MaterialsModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'suppliers' && <SuppliersModule loadRefs={loadReferences} />}
            {activeModule === 'locations' && <LocationsModule loadRefs={loadReferences} />}
            {activeModule === 'params' && <ParamsModule loadRefs={loadReferences} />}
            {activeModule === 'movements' && <MovementsModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'balances' && <BalancesModule refs={references} />}
            {activeModule === 'links' && <LinksModule refs={references} loadRefs={loadReferences} />}
          </main>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// MÓDULO: CATEGORIAS
// ============================================================================
function CategoriesModule({ loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.categories.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', description: '' }); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name || '', code: item.code || '', description: item.description || '' }); setShowModal(true); };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (editing) {
        await adminWarehouse.categories.update(editing.id, form);
        notify.success('Categoria atualizada!');
      } else {
        await adminWarehouse.categories.create(form);
        notify.success('Categoria criada!');
      }
      setShowModal(false);
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
      await adminWarehouse.categories.delete(editing.id);
      notify.success('Categoria removida');
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

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'code', label: 'Código' },
    { key: 'description', label: 'Descrição' },
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
        <p className="module-desc">Organize os itens do estoque por tipo (matéria-prima, peças, ferramentas, insumos, etc.).</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova Categoria</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhuma categoria cadastrada" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'} size="medium">
        <div className="generic-form">
          <InputField label="Nome" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <InputField label="Código (opcional)" name="code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <TextAreaField label="Descrição" name="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Categoria" size="small">
        <p>Deseja remover esta categoria? Materiais vinculados não serão excluídos.</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: MATERIAIS
// ============================================================================
function MaterialsModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', code: '', category_id: '', default_supplier_id: '', unit: 'UN',
    technical_description: '', min_stock: 0, ideal_stock: 0, usage_type: 'general', default_location_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.materials.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const categoryOpts = (refs?.categories || []).map((c) => ({ value: c.id, label: c.name }));
  const supplierOpts = (refs?.suppliers || []).map((s) => ({ value: s.id, label: s.name }));
  const locationOpts = (refs?.locations || []).map((l) => ({
    value: l.id,
    label: `${l.warehouse_sector || ''} ${l.aisle_area ? `- ${l.aisle_area}` : ''} ${l.shelf_position ? `- ${l.shelf_position}` : ''}`.trim()
  }));

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', code: '', category_id: '', default_supplier_id: '', unit: 'UN',
      technical_description: '', min_stock: 0, ideal_stock: 0, usage_type: 'general', default_location_id: ''
    });
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '', code: item.code || '', category_id: item.category_id || '',
      default_supplier_id: item.default_supplier_id || '', unit: item.unit || 'UN',
      technical_description: item.technical_description || '', min_stock: item.min_stock ?? 0, ideal_stock: item.ideal_stock ?? 0,
      usage_type: item.usage_type || 'general', default_location_id: item.default_location_id || ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = ['min_stock', 'ideal_stock'].includes(name) ? parseFloat(value) || 0 : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = { ...form, category_id: form.category_id || null, default_supplier_id: form.default_supplier_id || null, default_location_id: form.default_location_id || null };
      if (editing) {
        await adminWarehouse.materials.update(editing.id, payload);
        notify.success('Material atualizado!');
      } else {
        await adminWarehouse.materials.create(payload);
        notify.success('Material criado!');
      }
      setShowModal(false);
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
      await adminWarehouse.materials.delete(editing.id);
      notify.success('Material removido');
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

  const columns = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nome' },
    { key: 'category_name', label: 'Categoria' },
    { key: 'unit', label: 'Unidade' },
    { key: 'min_stock', label: 'Mín.' },
    { key: 'ideal_stock', label: 'Ideal' },
    { key: 'usage_type', label: 'Uso' },
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
        <p className="module-desc">Registre todos os itens do estoque com nome, código, categoria, unidade, estoques mín e ideal.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo Material</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum material cadastrado" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Material' : 'Novo Material'} size="large">
        <div className="generic-form">
          <div className="form-grid-2">
            <InputField label="Nome" name="name" value={form.name} onChange={handleChange} required />
            <InputField label="Código interno" name="code" value={form.code} onChange={handleChange} required />
          </div>
          <div className="form-grid-2">
            <SelectField label="Categoria" name="category_id" value={form.category_id} onChange={handleChange} options={categoryOpts} placeholder="Selecione" />
            <SelectField label="Unidade" name="unit" value={form.unit} onChange={handleChange} options={[
              { value: 'UN', label: 'Unidade (UN)' }, { value: 'KG', label: 'Quilograma (KG)' }, { value: 'L', label: 'Litro (L)' },
              { value: 'M', label: 'Metro (M)' }, { value: 'M2', label: 'm²' }, { value: 'CX', label: 'Caixa (CX)' }, { value: 'PC', label: 'Peça (PC)' }
            ]} />
          </div>
          <div className="form-grid-2">
            <SelectField label="Fornecedor padrão" name="default_supplier_id" value={form.default_supplier_id} onChange={handleChange} options={supplierOpts} placeholder="Selecione" />
            <SelectField label="Localização padrão" name="default_location_id" value={form.default_location_id} onChange={handleChange} options={locationOpts} placeholder="Selecione" />
          </div>
          <div className="form-grid-2">
            <InputField label="Estoque mínimo" name="min_stock" type="number" value={form.min_stock} onChange={handleChange} />
            <InputField label="Estoque ideal" name="ideal_stock" type="number" value={form.ideal_stock} onChange={handleChange} />
          </div>
          <SelectField label="Tipo de utilização" name="usage_type" value={form.usage_type} onChange={handleChange} options={USAGE_TYPES} />
          <TextAreaField label="Descrição técnica" name="technical_description" value={form.technical_description} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Material" size="small">
        <p>Deseja remover este material? O registro será inativado.</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: FORNECEDORES
// ============================================================================
function SuppliersModule({ loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', cnpj: '', commercial_contact: '', contact_email: '', contact_phone: '',
    avg_delivery_days: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.suppliers.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', cnpj: '', commercial_contact: '', contact_email: '', contact_phone: '', avg_delivery_days: '', notes: '' }); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '', cnpj: item.cnpj || '', commercial_contact: item.commercial_contact || '',
      contact_email: item.contact_email || '', contact_phone: item.contact_phone || '',
      avg_delivery_days: item.avg_delivery_days ?? '', notes: item.notes || ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = name === 'avg_delivery_days' ? (value ? parseInt(value, 10) : '') : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = { ...form, avg_delivery_days: form.avg_delivery_days ? parseInt(form.avg_delivery_days, 10) : null };
      if (editing) {
        await adminWarehouse.suppliers.update(editing.id, payload);
        notify.success('Fornecedor atualizado!');
      } else {
        await adminWarehouse.suppliers.create(payload);
        notify.success('Fornecedor criado!');
      }
      setShowModal(false);
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
      await adminWarehouse.suppliers.delete(editing.id);
      notify.success('Fornecedor removido');
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

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'commercial_contact', label: 'Contato' },
    { key: 'contact_phone', label: 'Telefone' },
    { key: 'avg_delivery_days', label: 'Prazo entrega (dias)' },
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
        <p className="module-desc">Cadastre fornecedores responsáveis pelo fornecimento dos materiais.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo Fornecedor</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum fornecedor cadastrado" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="medium">
        <div className="generic-form">
          <InputField label="Nome" name="name" value={form.name} onChange={handleChange} required />
          <InputField label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" />
          <InputField label="Contato comercial" name="commercial_contact" value={form.commercial_contact} onChange={handleChange} />
          <div className="form-grid-2">
            <InputField label="E-mail" name="contact_email" type="email" value={form.contact_email} onChange={handleChange} />
            <InputField label="Telefone" name="contact_phone" value={form.contact_phone} onChange={handleChange} />
          </div>
          <InputField label="Prazo médio de entrega (dias)" name="avg_delivery_days" type="number" value={form.avg_delivery_days} onChange={handleChange} />
          <TextAreaField label="Observações" name="notes" value={form.notes} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Fornecedor" size="small">
        <p>Deseja remover este fornecedor?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: LOCALIZAÇÕES
// ============================================================================
function LocationsModule({ loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ warehouse_sector: '', aisle_area: '', shelf_position: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.locations.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ warehouse_sector: '', aisle_area: '', shelf_position: '', description: '' }); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      warehouse_sector: item.warehouse_sector || '', aisle_area: item.aisle_area || '',
      shelf_position: item.shelf_position || '', description: item.description || ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (editing) {
        await adminWarehouse.locations.update(editing.id, form);
        notify.success('Localização atualizada!');
      } else {
        await adminWarehouse.locations.create(form);
        notify.success('Localização criada!');
      }
      setShowModal(false);
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
      await adminWarehouse.locations.delete(editing.id);
      notify.success('Localização removida');
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

  const columns = [
    { key: 'warehouse_sector', label: 'Galpão/Setor' },
    { key: 'aisle_area', label: 'Corredor/Área' },
    { key: 'shelf_position', label: 'Prateleira/Posição' },
    { key: 'description', label: 'Descrição' },
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
        <p className="module-desc">Organize fisicamente onde os materiais estão armazenados (galpão, corredor, prateleira).</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova Localização</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhuma localização cadastrada" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Localização' : 'Nova Localização'} size="medium">
        <div className="generic-form">
          <InputField label="Galpão ou setor" name="warehouse_sector" value={form.warehouse_sector} onChange={handleChange} required />
          <InputField label="Corredor ou área" name="aisle_area" value={form.aisle_area} onChange={handleChange} />
          <InputField label="Prateleira ou posição" name="shelf_position" value={form.shelf_position} onChange={handleChange} />
          <TextAreaField label="Descrição" name="description" value={form.description} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Localização" size="small">
        <p>Deseja remover esta localização?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: PARÂMETROS
// ============================================================================
function ParamsModule({ loadRefs }) {
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    min_safety_stock_pct: 20,
    critical_level_pct: 10,
    replenishment_alert_days: 7,
    consumption_analysis_frequency: 'daily'
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.params.get();
      const d = r.data?.data || {};
      setData(d);
      setForm({
        min_safety_stock_pct: d.min_safety_stock_pct ?? 20,
        critical_level_pct: d.critical_level_pct ?? 10,
        replenishment_alert_days: d.replenishment_alert_days ?? 7,
        consumption_analysis_frequency: d.consumption_analysis_frequency || 'daily'
      });
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = ['min_safety_stock_pct', 'critical_level_pct', 'replenishment_alert_days'].includes(name)
      ? parseFloat(value) || 0
      : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminWarehouse.params.update({
        ...form,
        replenishment_alert_days: parseInt(form.replenishment_alert_days, 10) || 7
      });
      notify.success('Parâmetros atualizados!');
      load();
      if (loadRefs) loadRefs();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="module-loading">Carregando...</div>;

  return (
    <div className="params-module">
      <p className="module-desc">Configure parâmetros que a IA utilizará para monitorar estoque e gerar alertas.</p>
      <div className="form-section">
        <div className="form-grid-2">
          <InputField
            label="Estoque mínimo de segurança (%)"
            name="min_safety_stock_pct"
            type="number"
            value={form.min_safety_stock_pct}
            onChange={handleChange}
            helperText="Percentual do estoque ideal considerado seguro"
          />
          <InputField
            label="Nível crítico de estoque (%)"
            name="critical_level_pct"
            type="number"
            value={form.critical_level_pct}
            onChange={handleChange}
            helperText="Abaixo deste valor, alerta crítico"
          />
        </div>
        <div className="form-grid-2">
          <InputField
            label="Alerta de reposição (dias)"
            name="replenishment_alert_days"
            type="number"
            value={form.replenishment_alert_days}
            onChange={handleChange}
            helperText="Antecedência para alertar necessidade de compra"
          />
          <SelectField
            label="Frequência de análise de consumo"
            name="consumption_analysis_frequency"
            value={form.consumption_analysis_frequency}
            onChange={handleChange}
            options={FREQUENCY_OPTIONS}
          />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar parâmetros'}</button>
      </div>
    </div>
  );
}

// ============================================================================
// MÓDULO: MOVIMENTAÇÕES
// ============================================================================
function MovementsModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    material_id: '', movement_type: 'entrada', quantity: '',
    location_id: '', notes: '', document_ref: ''
  });
  const [saving, setSaving] = useState(false);
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => { load(); }, [filterMaterial, filterType]);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterMaterial) params.material_id = filterMaterial;
      if (filterType) params.movement_type = filterType;
      const r = await adminWarehouse.movements.list(params);
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const materialOpts = (refs?.materials || []).map((m) => ({ value: m.id, label: `${m.code} - ${m.name}` }));
  const locationOpts = (refs?.locations || []).map((l) => ({
    value: l.id,
    label: `${l.warehouse_sector || ''} ${l.aisle_area ? `- ${l.aisle_area}` : ''}`.trim()
  }));

  const openCreate = () => {
    setForm({
      material_id: '', movement_type: 'entrada', quantity: '',
      location_id: '', notes: '', document_ref: ''
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = name === 'quantity' ? (value ? parseFloat(value) : '') : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (!form.material_id || !form.quantity || form.quantity <= 0) {
        notify.error('Material e quantidade são obrigatórios.');
        return;
      }
      await adminWarehouse.movements.create({
        ...form,
        quantity: parseFloat(form.quantity),
        location_id: form.location_id || null
      });
      notify.success('Movimentação registrada!');
      setShowModal(false);
      load();
      if (loadRefs) loadRefs();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao registrar');
    } finally {
      setSaving(false);
    }
  };

  const formatType = (t) => {
    const m = MOVEMENT_TYPES.find((x) => x.value === t);
    return m?.label || t;
  };

  const columns = [
    { key: 'created_at', label: 'Data', render: (v) => v ? new Date(v).toLocaleString('pt-BR') : '-' },
    { key: 'material_name', label: 'Material' },
    { key: 'movement_type', label: 'Tipo', render: (v) => formatType(v) },
    { key: 'quantity', label: 'Quantidade', render: (v) => v != null ? parseFloat(v).toLocaleString('pt-BR') : '-' },
    { key: 'unit', label: 'Unidade' },
    { key: 'user_name', label: 'Responsável' },
    { key: 'notes', label: 'Observações' }
  ];

  return (
    <div className="crud-module">
      <div className="module-header">
        <p className="module-desc">Registre entradas, saídas, consumos e ajustes de inventário.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova Movimentação</button>
      </div>
      <div className="filters-row">
        <select
          value={filterMaterial}
          onChange={(e) => setFilterMaterial(e.target.value)}
          className="form-select filter-select"
        >
          <option value="">Todos os materiais</option>
          {materialOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="form-select filter-select"
        >
          <option value="">Todos os tipos</option>
          {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhuma movimentação registrada" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Movimentação" size="medium">
        <div className="generic-form">
          <SelectField label="Material" name="material_id" value={form.material_id} onChange={handleChange} options={materialOpts} placeholder="Selecione" required />
          <SelectField label="Tipo" name="movement_type" value={form.movement_type} onChange={handleChange} options={MOVEMENT_TYPES} />
          <InputField label="Quantidade" name="quantity" type="number" step="any" value={form.quantity} onChange={handleChange} required />
          <SelectField label="Localização (opcional)" name="location_id" value={form.location_id} onChange={handleChange} options={locationOpts} placeholder="Selecione" />
          <InputField label="Ref. documento" name="document_ref" value={form.document_ref} onChange={handleChange} />
          <TextAreaField label="Observações" name="notes" value={form.notes} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Registrar" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: SALDOS
// ============================================================================
function BalancesModule({ refs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.balances.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'material_code', label: 'Código' },
    { key: 'material_name', label: 'Material' },
    { key: 'quantity', label: 'Saldo atual', render: (v) => v != null ? parseFloat(v).toLocaleString('pt-BR') : '0' },
    { key: 'unit', label: 'Unidade' },
    { key: 'min_stock', label: 'Mínimo' },
    { key: 'ideal_stock', label: 'Ideal' },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const qty = parseFloat(row.quantity || 0);
        const min = parseFloat(row.min_stock || 0);
        if (min > 0 && qty < min) return <span className="badge badge-danger">Abaixo do mínimo</span>;
        if (min > 0 && qty <= min * 1.2) return <span className="badge badge-warning">Atenção</span>;
        return <span className="badge badge-ok">OK</span>;
      }
    }
  ];

  return (
    <div className="crud-module">
      <p className="module-desc">Visão consolidada do saldo atual de cada material. Materiais abaixo do mínimo aparecem em destaque.</p>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum saldo registrado (cadastre materiais e movimentações)" />
    </div>
  );
}

// ============================================================================
// MÓDULO: VÍNCULOS
// ============================================================================
function LinksModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    material_id: '', link_type: 'production',
    process_id: '', production_line_id: '', asset_id: '', department_id: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminWarehouse.links.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const materialOpts = (refs?.materials || []).map((m) => ({ value: m.id, label: `${m.code} - ${m.name}` }));
  const processOpts = (refs?.processes || []).map((p) => ({ value: p.id, label: p.name }));
  const lineOpts = (refs?.productionLines || []).map((l) => ({ value: l.id, label: l.name }));
  const assetOpts = (refs?.assets || []).map((a) => ({ value: a.id, label: a.name }));
  const deptOpts = (refs?.departments || []).map((d) => ({ value: d.id, label: d.name }));

  const openCreate = () => {
    setEditing(null);
    setForm({
      material_id: '', link_type: 'production',
      process_id: '', production_line_id: '', asset_id: '', department_id: '', notes: ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await adminWarehouse.links.create({
        ...form,
        process_id: form.process_id || null,
        production_line_id: form.production_line_id || null,
        asset_id: form.asset_id || null,
        department_id: form.department_id || null
      });
      notify.success('Vínculo criado!');
      setShowModal(false);
      load();
      if (loadRefs) loadRefs();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await adminWarehouse.links.delete(editing.id);
      notify.success('Vínculo removido');
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

  const formatLinkType = (t) => {
    const m = LINK_TYPES.find((x) => x.value === t);
    return m?.label || t;
  };

  const columns = [
    { key: 'material_name', label: 'Material' },
    { key: 'material_code', label: 'Código' },
    { key: 'link_type', label: 'Tipo', render: (v) => formatLinkType(v) },
    { key: 'process_name', label: 'Processo' },
    { key: 'line_name', label: 'Linha' },
    { key: 'asset_name', label: 'Ativo' },
    { key: 'department_name', label: 'Departamento' },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button className="action-btn delete" onClick={() => openDelete(row)} title="Remover"><Trash2 size={14} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="crud-module">
      <div className="module-header">
        <p className="module-desc">Vincule materiais aos processos da empresa (produção, manutenção, ordens de serviço) para rastreabilidade.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo Vínculo</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum vínculo cadastrado" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo Vínculo Material ↔ Processo" size="medium">
        <div className="generic-form">
          <SelectField label="Material" name="material_id" value={form.material_id} onChange={handleChange} options={materialOpts} placeholder="Selecione" required />
          <SelectField label="Tipo de vínculo" name="link_type" value={form.link_type} onChange={handleChange} options={LINK_TYPES} />
          <SelectField label="Processo" name="process_id" value={form.process_id} onChange={handleChange} options={processOpts} placeholder="Selecione" />
          <SelectField label="Linha de produção" name="production_line_id" value={form.production_line_id} onChange={handleChange} options={lineOpts} placeholder="Selecione" />
          <SelectField label="Ativo/Equipamento" name="asset_id" value={form.asset_id} onChange={handleChange} options={assetOpts} placeholder="Selecione" />
          <SelectField label="Departamento" name="department_id" value={form.department_id} onChange={handleChange} options={deptOpts} placeholder="Selecione" />
          <TextAreaField label="Observações" name="notes" value={form.notes} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Vínculo" size="small">
        <p>Deseja remover este vínculo?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}
