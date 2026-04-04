/**
 * ADMINISTRAÇÃO DE USUÁRIOS
 * Página completa de gestão de usuários (RBAC)
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, UserPlus, Edit, Trash2, Key, 
  Shield, Check, X, AlertCircle, Users 
} from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, CheckboxField, TextAreaField } from '../components/FormField';
import { adminUsers, adminDepartments } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminUsers.css';

export default function AdminUsers() {
  const notify = useNotification();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    department_id: '',
    active: '',
    hierarchy_level: ''
  });

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const AREA_FIXED = ['Direção', 'Gerência', 'Coordenação', 'Supervisão'];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'colaborador',
    area: 'Colaborador',
    custom_area: '',
    job_title: '',
    department: '',
    department_id: '',
    supervisor_id: '',
    hr_responsibilities: '',
    phone: '',
    whatsapp_number: '',
    hierarchy_level: 5,
    permissions: [],
    active: true,
    executive_verified: false
  });

  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, [pagination.offset, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        offset: pagination.offset,
        search: searchQuery || undefined,
        ...filters
      };

      const response = await adminUsers.list(params);
      setUsers(response.data?.users ?? []);
      setPagination(response.data?.pagination ?? { total: 0, limit: 50, offset: 0 });
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await adminDepartments.list();
      setDepartments(response.data?.departments ?? []);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    loadUsers();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (newOffset) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  // CRUD Operations
  const handleCreate = async () => {
    try {
      setSaving(true);
      setFormErrors({});

      const areaVal = formData.area === '__custom__' ? (formData.custom_area?.trim() || undefined) : (formData.area || undefined);
      const payload = {
        ...formData,
        area: areaVal,
        job_title: formData.job_title?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        department_id: formData.department_id || undefined,
        supervisor_id: formData.supervisor_id || null,
        phone: formData.phone || undefined,
        whatsapp_number: formData.whatsapp_number || undefined,
        hierarchy_level: Number(formData.hierarchy_level) ?? 5,
        hr_responsibilities: formData.hr_responsibilities?.trim() || undefined,
      };

      await adminUsers.create(payload);
      
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      if (error.response?.data?.details) {
        const errors = {};
        error.response.data.details.forEach(err => {
          errors[err.path[0]] = err.message;
        });
        setFormErrors(errors);
      } else {
        notify.error(error.apiMessage || error.response?.data?.error || error.message || 'Erro ao criar usuário');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser?.id) return;
    try {
      setSaving(true);
      setFormErrors({});

      const areaVal = formData.area === '__custom__' ? (formData.custom_area?.trim() || undefined) : (formData.area || undefined);
      const updateData = {
        ...formData,
        area: areaVal,
        job_title: formData.job_title?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        department_id: formData.department_id || undefined,
        supervisor_id: formData.supervisor_id || null,
        phone: formData.phone || undefined,
        whatsapp_number: formData.whatsapp_number || undefined,
        hierarchy_level: formData.hierarchy_level !== undefined && formData.hierarchy_level !== ''
          ? Number(formData.hierarchy_level)
          : undefined,
        hr_responsibilities: formData.hr_responsibilities?.trim() || undefined,
      };
      delete updateData.password; // Não atualizar senha aqui

      await adminUsers.update(selectedUser.id, updateData);
      
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      if (error.response?.data?.details) {
        const errors = {};
        error.response.data.details.forEach(err => {
          errors[err.path[0]] = err.message;
        });
        setFormErrors(errors);
      } else {
        notify.error(error.apiMessage || error.response?.data?.error || error.message || 'Erro ao atualizar usuário');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser?.id) return;
    try {
      setSaving(true);
      await adminUsers.delete(selectedUser.id);
      
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      notify.error(error.apiMessage || error.response?.data?.error || error.message || 'Erro ao desativar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser?.id) return;
    try {
      setSaving(true);
      
      if (!formData.password || formData.password.length < 8) {
        notify.warning('Nova senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula e número');
        return;
      }

      await adminUsers.resetPassword(selectedUser.id, formData.password);
      notify.success('Senha resetada com sucesso!');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      resetForm();
    } catch (error) {
      const details = error.response?.data?.details;
      const msg = details?.[0]?.message || error.response?.data?.error || error.apiMessage || error.message || 'Erro ao resetar senha';
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    const userArea = user.area || (user.hierarchy_level <= 1 ? 'Direção' : user.hierarchy_level === 2 ? 'Gerência' : user.hierarchy_level === 3 ? 'Coordenação' : user.hierarchy_level === 4 ? 'Supervisão' : 'Colaborador');
    const isCustomArea = userArea && !AREA_FIXED.includes(userArea);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      area: isCustomArea ? '__custom__' : userArea,
      custom_area: isCustomArea ? userArea : '',
      job_title: user.job_title || '',
      department: user.department || '',
      department_id: user.department_id || '',
      supervisor_id: user.supervisor_id || '',
      hr_responsibilities: user.hr_responsibilities || '',
      phone: user.phone || '',
      whatsapp_number: user.whatsapp_number || '',
      hierarchy_level: user.hierarchy_level,
      permissions: user.permissions || [],
      active: user.active,
      executive_verified: user.executive_verified ?? false
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setFormData({ ...formData, password: '' });
    setShowResetPasswordModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'colaborador',
      area: 'Colaborador',
      custom_area: '',
      job_title: '',
      department: '',
      department_id: '',
      supervisor_id: '',
      hr_responsibilities: '',
      phone: '',
      whatsapp_number: '',
      hierarchy_level: 5,
      permissions: [],
      active: true,
      executive_verified: false
    });
    setFormErrors({});
  };

  const AREA_TO_LEVEL = { Direção: 1, Gerência: 2, Coordenação: 3, Supervisão: 4 };
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const next = { ...prev };
      if (type === 'checkbox') next[name] = checked;
      else if (name === 'hierarchy_level') next[name] = (() => { const n = parseInt(value, 10); return Number.isNaN(n) ? 5 : Math.max(0, Math.min(5, n)); })();
      else if (name === 'area') {
        next[name] = value;
        if (value === '__custom__') {
          next.hierarchy_level = 5;
          next.custom_area = prev.custom_area || '';
        } else {
          next.custom_area = '';
        if (prev.role !== 'ceo') next.hierarchy_level = AREA_TO_LEVEL[value] ?? 5;
        }
      } else if (name === 'custom_area') {
        next.custom_area = value;
      } else next[name] = value;
      return next;
    });
  };

  // Colunas da tabela
  const columns = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (value, row) => (
        <div className="user-cell">
          <div className="user-avatar">
            {row.avatar_url ? (
              <img src={row.avatar_url} alt={value} />
            ) : (
              <span>{value?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="user-info">
            <div className="user-name">{value}</div>
            <div className="user-email">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Função',
      render: (value, row) => (
        <span className="role-cell">
          <span className={`badge badge-${getRoleBadgeColor(value)}`}>
            {getRoleLabel(value)}
          </span>
          {value === 'ceo' && (
            <span className={`badge badge-${row.executive_verified ? 'success' : 'warning'}`} title={row.executive_verified ? 'Executivo verificado' : 'Aguardando verificação'}>
              {row.executive_verified ? '✓ Verificado' : 'Pendente'}
            </span>
          )}
        </span>
      )
    },
    {
      key: 'department_name',
      label: 'Departamento',
      render: (value) => value || '-'
    },
    {
      key: 'hierarchy_level',
      label: 'Nível',
      render: (value) => getHierarchyLabel(value)
    },
    {
      key: 'active',
      label: 'Status',
      render: (value) => (
        <span className={`status-badge ${value ? 'active' : 'inactive'}`}>
          {value ? <Check size={14} /> : <X size={14} />}
          {value ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, row) => (
        <div className="table-actions">
          <button 
            className="action-btn edit" 
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            title="Editar"
          >
            <Edit size={16} />
          </button>
          <button 
            className="action-btn password" 
            onClick={(e) => { e.stopPropagation(); openResetPasswordModal(row); }}
            title="Resetar senha"
          >
            <Key size={16} />
          </button>
          <button 
            className="action-btn delete" 
            onClick={(e) => { e.stopPropagation(); openDeleteModal(row); }}
            title="Desativar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="admin-users-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <div className="page-icon">
              <Users size={24} />
            </div>
            <div>
              <h1 className="page-title">Gestão de Usuários</h1>
              <p className="page-subtitle">Gerenciar usuários, permissões e hierarquia</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <UserPlus size={18} />
            Novo Usuário
          </button>
        </div>

        {/* Filtros e busca */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <SelectField
            name="role"
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            options={[
              { value: '', label: 'Todas as funções' },
              { value: 'ceo', label: 'CEO' },
              { value: 'diretor', label: 'Diretor' },
              { value: 'gerente', label: 'Gerente' },
              { value: 'coordenador', label: 'Coordenador' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'colaborador', label: 'Colaborador' }
            ]}
          />

          <SelectField
            name="active"
            value={filters.active}
            onChange={(e) => handleFilterChange('active', e.target.value)}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'true', label: 'Ativos' },
              { value: 'false', label: 'Inativos' }
            ]}
          />

          <button className="btn btn-secondary" onClick={handleSearch}>
            <Filter size={18} />
            Filtrar
          </button>
        </div>

        {/* Tabela */}
        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="Nenhum usuário encontrado"
          pagination={pagination}
          onPageChange={handlePageChange}
        />

        {/* Modal de Criar Usuário */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Novo Usuário"
          size="large"
        >
          <UserForm
            formData={formData}
            formErrors={formErrors}
            departments={departments}
            users={users}
            onChange={handleFormChange}
            isCreate={true}
          />
          <ModalFooter
            onCancel={() => setShowCreateModal(false)}
            onConfirm={handleCreate}
            confirmText="Criar Usuário"
            confirmLoading={saving}
            confirmDisabled={!formData.name || !formData.email || !formData.password || (formData.area === '__custom__' && !formData.custom_area?.trim()) || (formData.role === 'ceo' && (!formData.whatsapp_number || formData.whatsapp_number.trim().length < 10))}
          />
        </Modal>

        {/* Modal de Editar Usuário */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Editar Usuário"
          size="large"
        >
          <UserForm
            formData={formData}
            formErrors={formErrors}
            departments={departments}
            users={users}
            selectedUserId={selectedUser?.id}
            onChange={handleFormChange}
            isCreate={false}
          />
          <ModalFooter
            onCancel={() => setShowEditModal(false)}
            onConfirm={handleUpdate}
            confirmText="Salvar Alterações"
            confirmLoading={saving}
            confirmDisabled={!formData.name || !formData.email || (formData.area === '__custom__' && !formData.custom_area?.trim())}
          />
        </Modal>

        {/* Modal de Deletar Usuário */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Desativar Usuário"
          size="small"
        >
          <div className="delete-confirmation">
            <AlertCircle size={48} color="var(--color-error)" />
            <h3>Desativar usuário?</h3>
            <p>
              Você está prestes a desativar o usuário <strong>{selectedUser?.name}</strong>.
              Esta ação irá invalidar todas as sessões ativas do usuário.
            </p>
          </div>
          <ModalFooter
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            confirmText="Sim, desativar"
            confirmVariant="danger"
            confirmLoading={saving}
          />
        </Modal>

        {/* Modal de Resetar Senha */}
        <Modal
          isOpen={showResetPasswordModal}
          onClose={() => setShowResetPasswordModal(false)}
          title="Resetar Senha"
          size="small"
        >
          <div className="reset-password-content">
            <p>Resetar senha do usuário <strong>{selectedUser?.name}</strong></p>
            <InputField
              label="Nova Senha"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleFormChange}
              placeholder="Mín. 8 caracteres, maiúscula, minúscula e número"
              required
              helperText="Deve conter maiúscula, minúscula e número"
            />
          </div>
          <ModalFooter
            onCancel={() => setShowResetPasswordModal(false)}
            onConfirm={handleResetPassword}
            confirmText="Resetar Senha"
            confirmVariant="primary"
            confirmLoading={saving}
            confirmDisabled={!formData.password || formData.password.length < 8}
          />
        </Modal>
      </div>
    </Layout>
  );
}

/**
 * USER FORM COMPONENT
 */
function UserForm({ formData, formErrors, departments, users = [], selectedUserId, onChange, isCreate }) {
  const supervisorOptions = (users || [])
    .filter(u => u.active !== false && (u.hierarchy_level ?? 5) <= 4 && u.id !== selectedUserId)
    .map(u => ({ value: u.id, label: `${u.name} (${getHierarchyLabel(u.hierarchy_level)})` }));
  return (
    <div className="user-form">
      <div className="form-grid-2">
        <InputField
          label="Nome Completo"
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder="Ex: João Silva"
          required
          error={formErrors.name}
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          placeholder="usuario@empresa.com"
          required
          error={formErrors.email}
        />
      </div>

      {isCreate && (
        <InputField
          label="Senha"
          name="password"
          type="password"
          value={formData.password}
          onChange={onChange}
          placeholder="Mín. 8 caracteres, maiúscula, minúscula e número"
          required
          error={formErrors.password}
          helperText="Deve conter maiúscula, minúscula e número"
        />
      )}

      <div className="form-grid-2">
        <SelectField
          label="Função"
          name="role"
          value={formData.role}
          onChange={onChange}
          required
          options={[
            { value: 'ceo', label: 'CEO' },
            { value: 'diretor', label: 'Diretor' },
            { value: 'gerente', label: 'Gerente' },
            { value: 'coordenador', label: 'Coordenador' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'colaborador', label: 'Colaborador' }
          ]}
        />

        <SelectField
          label="Área"
          name="area"
          value={formData.area || ''}
          onChange={onChange}
          required
          options={[
            { value: 'Direção', label: 'Direção' },
            { value: 'Gerência', label: 'Gerência' },
            { value: 'Coordenação', label: 'Coordenação' },
            { value: 'Supervisão', label: 'Supervisão' },
            { value: '__custom__', label: 'Outra área (cadastrar)' }
          ]}
          helperText="Define escopo de dados e acesso aos módulos (ex: Manutenção, Qualidade)"
        />

        {formData.area === '__custom__' && (
          <InputField
            label="Nome da área"
            name="custom_area"
            value={formData.custom_area}
            onChange={onChange}
            placeholder="Ex: Manutenção, Qualidade, Logística"
            required
            helperText="Ex: Manutenção para mecânicos, Qualidade para inspetores"
          />
        )}

        {formData.area === 'Direção' && (
          <CheckboxField
            label="Definir como CEO"
            name="is_ceo"
            checked={formData.role === 'ceo'}
            onChange={onChange}
            helperText="Ativa o Modo Executivo com acesso via WhatsApp e dashboard exclusivo"
          />
        )}
      </div>

      <TextAreaField
        label="O que faz / descrição do papel"
        name="hr_responsibilities"
        value={formData.hr_responsibilities || ''}
        onChange={onChange}
        placeholder="Ex: Mecânico de manutenção na linha 2 — corrige paradas, lubrificação e PMOs; reporta ao supervisor de manutenção."
        rows={4}
        error={formErrors.hr_responsibilities}
        helperText="Descreva setor, função e atividades principais. A IA usa isso para personalizar linguagem, prioridades e escopo (até 2000 caracteres)."
      />

      <div className="form-grid-2">
        <InputField
          label="Cargo"
          name="job_title"
          value={formData.job_title}
          onChange={onChange}
          placeholder="Ex: Diretor Financeiro, Gerente Industrial"
          helperText="Campo livre - a IA usa para priorizar indicadores"
        />

        <InputField
          label="Setor/Departamento"
          name="department"
          value={formData.department}
          onChange={onChange}
          placeholder="Ex: Financeiro, Produção, Manutenção"
          helperText="Texto livre (normalizado internamente)"
        />
      </div>

      <div className="form-grid-2">
        <SelectField
          label="Supervisor Imediato"
          name="supervisor_id"
          value={formData.supervisor_id}
          onChange={onChange}
          placeholder="Nenhum"
          options={[{ value: '', label: 'Nenhum' }, ...supervisorOptions]}
          helperText="Define vínculo hierárquico para filtro de dados"
        />
      </div>

      <div className="form-grid-2">
        <InputField
          label="Telefone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={onChange}
          placeholder="(31) 99999-9999"
        />

        <InputField
          label="WhatsApp"
          name="whatsapp_number"
          type="tel"
          value={formData.whatsapp_number}
          onChange={onChange}
          placeholder="5531999999999"
          required={formData.role === 'ceo'}
          error={formErrors.whatsapp_number}
          helperText={formData.role === 'ceo' ? 'Obrigatório para CEO (Modo Executivo via WhatsApp)' : 'Formato: código do país + DDD + número'}
        />
      </div>

      {!isCreate && formData.role === 'ceo' && (
        <CheckboxField
          label="Executivo verificado (Modo CEO)"
          name="executive_verified"
          checked={formData.executive_verified}
          onChange={onChange}
          helperText="Libera acesso via WhatsApp. Normalmente verificado pelo envio do certificado IPC."
        />
      )}

      {!isCreate && (
        <CheckboxField
          label="Usuário ativo"
          name="active"
          checked={formData.active}
          onChange={onChange}
          helperText="Desmarque para desativar o usuário"
        />
      )}
    </div>
  );
}

// Funções auxiliares
function getRoleLabel(role) {
  const roles = {
    ceo: 'CEO',
    diretor: 'Diretor',
    gerente: 'Gerente',
    coordenador: 'Coordenador',
    supervisor: 'Supervisor',
    colaborador: 'Colaborador'
  };
  return roles[role] || role;
}

function getRoleBadgeColor(role) {
  const colors = {
    ceo: 'purple',
    diretor: 'purple',
    gerente: 'blue',
    coordenador: 'indigo',
    supervisor: 'teal',
    colaborador: 'gray'
  };
  return colors[role] || 'gray';
}

function getHierarchyLabel(level) {
  const labels = {
    0: 'CEO',
    1: 'Diretoria',
    2: 'Gerência',
    3: 'Coordenação',
    4: 'Supervisão',
    5: 'Operacional'
  };
  return labels[level] ?? `Nível ${level}`;
}
