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
import { InputField, SelectField, CheckboxField } from '../components/FormField';
import FieldHelpHint from '../components/FieldHelpHint';
import { adminUsers, adminDepartments, adminStructural } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useProtectedMediaSrc } from '../utils/protectedUploadMedia';
import './AdminUsers.css';

function UserAvatarThumb({ rawUrl, name }) {
  const src = useProtectedMediaSrc(rawUrl || null);
  const initial = name?.charAt(0).toUpperCase() || '?';
  if (!rawUrl || !src) return <span>{initial}</span>;
  return <img src={src} alt={name || ''} />;
}

/** UUID / id vindo da API ou do driver pg (string ou outro tipo serializável). */
function uuidFieldToString(raw) {
  if (raw == null || raw === '') return '';
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (!s || s === 'undefined' || s === 'null') return '';
  return s;
}

export default function AdminUsers() {
  const notify = useNotification();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [structuralRoles, setStructuralRoles] = useState([]);
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsapp_number: '',
    company_role_id: '',
    active: true
  });

  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadUsers();
    loadDepartments();
    loadStructuralRoles();
  }, [pagination.offset, filters]);

  const loadStructuralRoles = async () => {
    try {
      const r = await adminStructural.roles.list();
      setStructuralRoles(r.data?.data ?? []);
    } catch (e) {
      console.warn('Cargos estruturais indisponíveis:', e);
      setStructuralRoles([]);
    }
  };

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

      const companyRoleId = uuidFieldToString(formData.company_role_id);
      if (!companyRoleId) {
        setFormErrors({ company_role_id: 'Selecione o cargo formal na Base Estrutural' });
        return;
      }

      const payload = {
        name: String(formData.name || '').trim(),
        email: String(formData.email || '').trim(),
        password: formData.password,
        company_role_id: companyRoleId,
        structural_role_id: companyRoleId,
        phone: formData.phone?.trim() || undefined,
        whatsapp_number: formData.whatsapp_number?.trim() || undefined
      };

      console.log('CREATE_USER_PAYLOAD', payload);

      await adminUsers.create(payload);
      
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      if (error.response?.data?.details) {
        const errors = {};
        error.response.data.details.forEach(err => {
          const field = err.path?.[0];
          if (field) errors[field] = err.message;
        });
        setFormErrors(errors);
        const firstDetail = error.response.data.details[0]?.message;
        if (firstDetail) {
          notify.error(firstDetail);
        }
      } else {
        notify.error(resolveUserMutationError(error, 'criar'));
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

      const companyRoleId = uuidFieldToString(formData.company_role_id);
      if (!companyRoleId) {
        setFormErrors({ company_role_id: 'Selecione o cargo formal na Base Estrutural' });
        return;
      }

      const updateData = {
        name: String(formData.name || '').trim(),
        email: String(formData.email || '').trim(),
        company_role_id: companyRoleId,
        structural_role_id: companyRoleId,
        phone: formData.phone?.trim() || undefined,
        whatsapp_number: formData.whatsapp_number?.trim() || undefined,
        active: formData.active
      };

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
        notify.error(resolveUserMutationError(error, 'atualizar'));
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

  const isSoftwareAdminLockedRow = (user) =>
    user?.software_admin_locked === true || user?.software_admin === true;

  const openEditModal = (user) => {
    if (isSoftwareAdminLockedRow(user)) {
      notify.error('Conta de administrador do software IMPETUS — protegida contra edição.');
      return;
    }
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      whatsapp_number: user.whatsapp_number || '',
      company_role_id: uuidFieldToString(user.company_role_id || user.structural_role_id),
      active: user.active
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    if (isSoftwareAdminLockedRow(user)) {
      notify.error('Não é permitido desactivar o administrador do software IMPETUS.');
      return;
    }
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openResetPasswordModal = (user) => {
    if (isSoftwareAdminLockedRow(user)) {
      notify.error('Reset de senha bloqueado para administrador do software IMPETUS.');
      return;
    }
    setSelectedUser(user);
    setFormData({ ...formData, password: '' });
    setShowResetPasswordModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      whatsapp_number: '',
      company_role_id: '',
      active: true
    });
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const findStructuralRole = (roleId) => {
    const id = uuidFieldToString(roleId);
    if (!id) return null;
    return (structuralRoles || []).find(
      (r) => uuidFieldToString(r.id || r.company_role_id) === id
    ) || null;
  };

  const isCeoStructuralSelection = (roleId) => {
    const r = findStructuralRole(roleId);
    return r != null && Number(r.hierarchy_level) === 0;
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
            <UserAvatarThumb rawUrl={row.avatar_url} name={value} />
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
          {row.software_admin_locked && (
            <span className="badge badge-info" title="Administrador do software — conta protegida">
              Admin software
            </span>
          )}
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
      render: (value, row) => value || row.department || '-'
    },
    {
      key: 'structural_role_name',
      label: 'Cargo (estrutural)',
      render: (value) => value || '—'
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
      render: (_, row) => {
        const locked = isSoftwareAdminLockedRow(row);
        return (
        <div className="table-actions">
          <button 
            className="action-btn edit" 
            disabled={locked}
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            title={locked ? 'Conta protegida (admin do software)' : 'Editar'}
          >
            <Edit size={16} />
          </button>
          <button 
            className="action-btn password" 
            disabled={locked}
            onClick={(e) => { e.stopPropagation(); openResetPasswordModal(row); }}
            title={locked ? 'Conta protegida' : 'Resetar senha'}
          >
            <Key size={16} />
          </button>
          <button 
            className="action-btn delete" 
            disabled={locked}
            onClick={(e) => { e.stopPropagation(); openDeleteModal(row); }}
            title={locked ? 'Conta protegida' : 'Desativar'}
          >
            <Trash2 size={16} />
          </button>
        </div>
        );
      }
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
            placeholder=""
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
            placeholder=""
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
            structuralRoles={structuralRoles}
            findStructuralRole={findStructuralRole}
            isCeoStructuralSelection={isCeoStructuralSelection}
            onChange={handleFormChange}
            isCreate={true}
          />
          <ModalFooter
            onCancel={() => setShowCreateModal(false)}
            onConfirm={handleCreate}
            confirmText="Criar Usuário"
            confirmLoading={saving}
            confirmDisabled={
              !formData.name?.trim()
              || !formData.email?.trim()
              || !formData.password
              || !uuidFieldToString(formData.company_role_id)
              || (isCeoStructuralSelection(formData.company_role_id)
                && (!formData.whatsapp_number || formData.whatsapp_number.trim().length < 10))
            }
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
            structuralRoles={structuralRoles}
            findStructuralRole={findStructuralRole}
            isCeoStructuralSelection={isCeoStructuralSelection}
            onChange={handleFormChange}
            isCreate={false}
          />
          <ModalFooter
            onCancel={() => setShowEditModal(false)}
            onConfirm={handleUpdate}
            confirmText="Salvar Alterações"
            confirmLoading={saving}
            confirmDisabled={
              !formData.name?.trim()
              || !formData.email?.trim()
              || !uuidFieldToString(formData.company_role_id)
              || (isCeoStructuralSelection(formData.company_role_id)
                && (!formData.whatsapp_number || formData.whatsapp_number.trim().length < 10))
            }
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
function StructuralRolePreview({ role, getHierarchyLabel }) {
  if (!role) return null;
  const sectors = Array.isArray(role.sectors_involved)
    ? role.sectors_involved.filter(Boolean)
    : [];
  const sectorLabel = sectors.length > 0 ? sectors.join(', ') : (role.work_area || '—');
  const rows = [
    { label: 'Cargo', value: role.name },
    { label: 'Setor', value: role.work_area },
    { label: 'Departamento / setores', value: sectorLabel },
    { label: 'Função operacional', value: role.operation_role },
    { label: 'Nível hierárquico', value: getHierarchyLabel(role.hierarchy_level) }
  ];
  return (
    <div className="structural-role-preview" aria-live="polite">
      <div className="structural-role-preview__title">Dados da Base Estrutural</div>
      <dl className="structural-role-preview__grid">
        {rows.map(({ label, value }) => (
          <div key={label} className="structural-role-preview__row">
            <dt>{label}</dt>
            <dd>{value && String(value).trim() ? value : '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function UserForm({
  formData,
  formErrors,
  structuralRoles = [],
  findStructuralRole,
  isCeoStructuralSelection,
  onChange,
  isCreate
}) {
  const structuralRoleOptions = [
    { value: '', label: 'Selecione o cargo formal…' },
    ...(structuralRoles || [])
      .filter((r) => r && (r.id != null || r.company_role_id != null) && uuidFieldToString(r.id || r.company_role_id))
      .map((r) => ({
        value: uuidFieldToString(r.id || r.company_role_id),
        label: `${r.name || ''}${r.work_area ? ` — ${r.work_area}` : ''}`
      }))
  ];
  const selectedRole = findStructuralRole
    ? findStructuralRole(formData.company_role_id)
    : null;
  const requiresWhatsapp = isCeoStructuralSelection
    ? isCeoStructuralSelection(formData.company_role_id)
    : false;

  return (
    <div className="user-form">
      <div className="form-grid-2">
        <InputField
          label={<span>Nome completo<FieldHelpHint term="nome completo usuario" /></span>}
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder="Ex: João Silva"
          required
          error={formErrors.name}
        />

        <InputField
          label={<span>Email<FieldHelpHint term="email usuario admin" /></span>}
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
          label={<span>Senha<FieldHelpHint term="senha usuario requisitos" /></span>}
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

      <SelectField
        label={<span>Cargo formal (Base Estrutural)<FieldHelpHint term="cargo base estrutural" /></span>}
        name="company_role_id"
        value={formData.company_role_id || ''}
        onChange={onChange}
        required
        options={structuralRoleOptions}
        error={formErrors.company_role_id}
        helperText="Cargo, setor, departamento, função e hierarquia vêm automaticamente da Base Estrutural."
      />

      <StructuralRolePreview role={selectedRole} getHierarchyLabel={getHierarchyLabel} />

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
          label={<span>WhatsApp<FieldHelpHint term="whatsapp ceo" /></span>}
          name="whatsapp_number"
          type="tel"
          value={formData.whatsapp_number}
          onChange={onChange}
          placeholder="5531999999999"
          required={requiresWhatsapp}
          error={formErrors.whatsapp_number}
          helperText={
            requiresWhatsapp
              ? 'Obrigatório para CEO (Modo Executivo via WhatsApp)'
              : 'Formato: código do país + DDD + número'
          }
        />
      </div>

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
const USER_ERROR_CODE_MESSAGES = {
  EMAIL_ALREADY_EXISTS: 'Email já cadastrado nesta empresa.',
  INVALID_STRUCTURAL_ROLE: 'Cargo inexistente ou inativo na Base Estrutural.',
  STRUCTURAL_ROLE_REQUIRED: 'Selecione o cargo formal na Base Estrutural.',
  NO_COMPANY: 'Sua conta não está vinculada a uma empresa.',
  CEO_WHATSAPP_REQUIRED: 'CEO deve ter WhatsApp cadastrado.',
  VALIDATION_ERROR: null,
  FOREIGN_KEY_VIOLATION: 'Cargo, departamento ou empresa inválido.',
  DUPLICATE_ENTRY: 'Registro duplicado — verifique email ou cargo.',
  CREATE_USER_FAILED: 'Não foi possível criar o usuário. Tente novamente.',
};

function resolveUserMutationError(error, action = 'processar') {
  const data = error.response?.data;
  const code = data?.code;
  if (code && USER_ERROR_CODE_MESSAGES[code]) {
    return USER_ERROR_CODE_MESSAGES[code];
  }
  return error.apiMessage || data?.error || error.message || `Erro ao ${action} usuário`;
}

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
