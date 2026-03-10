/**
 * ADMINISTRAÇÃO DE DEPARTAMENTOS
 * Gestão completa de departamentos e hierarquia organizacional
 */

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, ChevronRight, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { adminDepartments, adminUsers } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminDepartments.css';

export default function AdminDepartments() {
  const notify = useNotification();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_department_id: '',
    level: 1,
    type: 'producao',
    manager_id: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await adminDepartments.list(true);
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminUsers.list({ limit: 500 });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'level' ? (value ? parseInt(value) : 1) : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_department_id: '',
      level: 1,
      type: 'producao',
      manager_id: ''
    });
    setFormErrors({});
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setFormErrors({});
      await adminDepartments.create({
        ...formData,
        parent_department_id: formData.parent_department_id || null,
        manager_id: formData.manager_id || null
      });
      notify.success('Departamento criado com sucesso!');
      setShowCreateModal(false);
      resetForm();
      loadDepartments();
    } catch (error) {
      setFormErrors({ submit: error.apiMessage || error.response?.data?.error || 'Erro ao criar departamento' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      setFormErrors({});
      await adminDepartments.update(selectedDept.id, {
        ...formData,
        parent_department_id: formData.parent_department_id || null,
        manager_id: formData.manager_id || null,
        active: selectedDept?.active ?? true
      });
      notify.success('Departamento atualizado!');
      setShowEditModal(false);
      resetForm();
      setSelectedDept(null);
      loadDepartments();
    } catch (error) {
      setFormErrors({ submit: error.apiMessage || error.response?.data?.error || 'Erro ao atualizar departamento' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await adminDepartments.delete(selectedDept.id);
      setShowDeleteModal(false);
      setSelectedDept(null);
      loadDepartments();
    } catch (error) {
      notify.error(error.apiMessage || error.response?.data?.error || 'Erro ao desativar departamento');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (dept) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      parent_department_id: dept.parent_department_id || '',
      level: dept.level,
      type: dept.type || 'producao',
      manager_id: dept.manager_id || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (dept) => {
    setSelectedDept(dept);
    setShowDeleteModal(true);
  };

  const columns = [
    {
      key: 'name',
      label: 'Departamento',
      render: (value, row) => (
        <div className="dept-cell">
          <Building2 size={18} className="dept-icon" />
          <div>
            <div className="dept-name">{value}</div>
            {row.description && <div className="dept-desc">{row.description}</div>}
          </div>
        </div>
      )
    },
    { key: 'level', label: 'Nível', render: (v) => `Nível ${v}` },
    { key: 'type', label: 'Tipo', render: (v) => getTypeLabel(v) },
    { key: 'manager_name', label: 'Gestor', render: (v) => v || '-' },
    { key: 'users_count', label: 'Usuários', render: (v) => v || 0 },
    {
      key: 'active',
      label: 'Status',
      render: (v) => (
        <span className={`status-badge ${v ? 'active' : 'inactive'}`}>
          {v ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button className="action-btn edit" onClick={() => openEditModal(row)} title="Editar">
            <Edit size={16} />
          </button>
          <button className="action-btn delete" onClick={() => openDeleteModal(row)} title="Desativar">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const managerOptions = users.map(u => ({ value: u.id, label: u.name }));

  return (
    <Layout>
      <div className="admin-departments-page">
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="page-title">Gestão de Departamentos</h1>
              <p className="page-subtitle">Organize a estrutura hierárquica da empresa</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <Plus size={18} />
            Novo Departamento
          </button>
        </div>

        <div className="view-toggle">
          <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            Lista
          </button>
          <button className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>
            Hierarquia
          </button>
        </div>

        {viewMode === 'list' ? (
          <Table
            columns={columns}
            data={departments}
            loading={loading}
            emptyMessage="Nenhum departamento cadastrado"
          />
        ) : (
          <div className="dept-tree-view">
            {loading ? (
              <div className="tree-loading">Carregando...</div>
            ) : (
              <DepartmentTree departments={departments} onEdit={openEditModal} onDelete={openDeleteModal} parentId={null} />
            )}
          </div>
        )}

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Novo Departamento" size="medium">
          <DepartmentForm formData={formData} formErrors={formErrors} departments={departments} users={managerOptions} onChange={handleFormChange} />
          {formErrors.submit && <p className="form-error-msg">{formErrors.submit}</p>}
          <ModalFooter onCancel={() => setShowCreateModal(false)} onConfirm={handleCreate} confirmText="Criar Departamento" confirmLoading={saving} confirmDisabled={!formData.name} />
        </Modal>

        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Departamento" size="medium">
          <DepartmentForm formData={formData} formErrors={formErrors} departments={departments} users={managerOptions} onChange={handleFormChange} excludeId={selectedDept?.id} />
          {formErrors.submit && <p className="form-error-msg">{formErrors.submit}</p>}
          <ModalFooter onCancel={() => setShowEditModal(false)} onConfirm={handleUpdate} confirmText="Salvar" confirmLoading={saving} confirmDisabled={!formData.name} />
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Desativar Departamento" size="small">
          <div className="delete-confirmation">
            <AlertCircle size={48} color="var(--color-error)" />
            <h3>Desativar departamento?</h3>
            <p>O departamento <strong>{selectedDept?.name}</strong> será desativado.</p>
          </div>
          <ModalFooter onCancel={() => setShowDeleteModal(false)} onConfirm={handleDelete} confirmText="Sim, desativar" confirmVariant="danger" confirmLoading={saving} />
        </Modal>
      </div>
    </Layout>
  );
}

function DepartmentForm({ formData, formErrors, departments, users, onChange, excludeId }) {
  const parentOptions = (departments || []).filter(d => d.id !== excludeId).map(d => ({ value: d.id, label: d.name }));
  return (
    <div className="department-form">
      <InputField label="Nome" name="name" value={formData.name} onChange={onChange} required error={formErrors.name} />
      <TextAreaField label="Descrição" name="description" value={formData.description} onChange={onChange} rows={3} />
      <div className="form-grid-2">
        <SelectField label="Departamento Pai" name="parent_department_id" value={formData.parent_department_id} onChange={onChange} placeholder="Nenhum" options={parentOptions} />
        <SelectField label="Tipo" name="type" value={formData.type} onChange={onChange} options={[{ value: 'producao', label: 'Produção' }, { value: 'manutencao', label: 'Manutenção' }, { value: 'qualidade', label: 'Qualidade' }, { value: 'logistica', label: 'Logística' }, { value: 'administrativo', label: 'Administrativo' }, { value: 'outro', label: 'Outro' }]} />
      </div>
      <div className="form-grid-2">
        <SelectField label="Nível" name="level" value={formData.level} onChange={onChange} options={[{ value: 1, label: '1 - Diretoria' }, { value: 2, label: '2 - Gerência' }, { value: 3, label: '3 - Supervisão' }, { value: 4, label: '4 - Operacional' }]} />
        <SelectField label="Gestor" name="manager_id" value={formData.manager_id} onChange={onChange} placeholder="Selecione..." options={users} />
      </div>
    </div>
  );
}

function DepartmentTree({ departments, onEdit, onDelete, parentId }) {
  const children = departments.filter(d => (d.parent_department_id || null) === (parentId || null));
  if (children.length === 0 && !parentId) return <div className="tree-empty">Nenhum departamento na raiz</div>;
  return (
    <ul className="tree-list">
      {children.map(dept => (
        <li key={dept.id} className="tree-item">
          <div className="tree-node">
            <ChevronRight size={16} className="tree-chevron" />
            <Building2 size={18} />
            <span className="tree-name">{dept.name}</span>
            <span className="tree-meta">{dept.users_count || 0} usuários</span>
            <div className="tree-actions">
              <button onClick={() => onEdit(dept)}><Edit size={14} /></button>
              <button onClick={() => onDelete(dept)}><Trash2 size={14} /></button>
            </div>
          </div>
          <DepartmentTree departments={departments} onEdit={onEdit} onDelete={onDelete} parentId={dept.id} />
        </li>
      ))}
    </ul>
  );
}

function getTypeLabel(type) {
  const labels = { producao: 'Produção', manutencao: 'Manutenção', qualidade: 'Qualidade', logistica: 'Logística', administrativo: 'Administrativo', outro: 'Outro' };
  return labels[type] || type || '-';
}
