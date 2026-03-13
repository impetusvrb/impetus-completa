/**
 * ADMIN - Logística Inteligente + Expedição Monitorada
 * Cadastros: Veículos, Pontos, Rotas, Motoristas
 */
import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Route, Users, Plus, Edit, Trash2, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Modal, { ModalFooter } from '../components/Modal';
import { InputField, SelectField, TextAreaField } from '../components/FormField';
import { adminLogistics } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AdminWarehouse.css';

const MODULES = [
  { id: 'vehicles', label: 'Veículos e Frota', icon: Truck },
  { id: 'points', label: 'Pontos Logísticos', icon: MapPin },
  { id: 'routes', label: 'Rotas Logísticas', icon: Route },
  { id: 'drivers', label: 'Motoristas e Operadores', icon: Users }
];

const VEHICLE_TYPES = [
  { value: 'caminhao', label: 'Caminhão' },
  { value: 'van', label: 'Van' },
  { value: 'empilhadeira', label: 'Empilhadeira' },
  { value: 'drone_logistico', label: 'Drone logístico' },
  { value: 'carreta', label: 'Carreta' },
  { value: 'utilitario', label: 'Utilitário' }
];

const POINT_TYPES = [
  { value: 'doca', label: 'Doca' },
  { value: 'armazem', label: 'Armazém' },
  { value: 'centro_distribuicao', label: 'Centro de distribuição' },
  { value: 'estoque_intermediario', label: 'Estoque intermediário' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'outro', label: 'Outro' }
];

const DRIVER_ROLES = [
  { value: 'motorista', label: 'Motorista' },
  { value: 'operador_empilhadeira', label: 'Operador de empilhadeira' },
  { value: 'operador_carga', label: 'Operador de carga' },
  { value: 'supervisor_logistica', label: 'Supervisor logístico' },
  { value: 'outro', label: 'Outro' }
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_use', label: 'Em uso' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'inactive', label: 'Inativo' }
];

export default function AdminLogistics() {
  const [activeModule, setActiveModule] = useState('vehicles');
  const [references, setReferences] = useState(null);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const [v, p, r, d] = await Promise.all([
        adminLogistics.vehicles.list(),
        adminLogistics.points.list(),
        adminLogistics.routes.list(),
        adminLogistics.drivers.list()
      ]);
      setReferences({
        vehicles: v.data?.data || [],
        points: p.data?.data || [],
        routes: r.data?.data || [],
        drivers: d.data?.data || []
      });
    } catch (e) {
      console.error('Erro ao carregar referências:', e);
    }
  };

  return (
    <Layout>
      <div className="admin-warehouse-page">
        <div className="warehouse-header">
          <div className="header-left">
            <div className="page-icon" style={{ background: 'linear-gradient(135deg, #1e88e5, #0d47a1)' }}>
              <Truck size={24} color="white" />
            </div>
            <div>
              <h1 className="page-title">Logística Inteligente</h1>
              <p className="page-subtitle">Cadastros para expedição monitorada e análise de IA</p>
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
            {activeModule === 'vehicles' && <VehiclesModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'points' && <PointsModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'routes' && <RoutesModule refs={references} loadRefs={loadReferences} />}
            {activeModule === 'drivers' && <DriversModule refs={references} loadRefs={loadReferences} />}
          </main>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// MÓDULO: VEÍCULOS
// ============================================================================
function VehiclesModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    vehicle_type: 'caminhao',
    plate_or_id: '',
    capacity_kg: '',
    capacity_m3: '',
    avg_consumption: '',
    status: 'available',
    scheduled_maintenance: '',
    odometer_km: '0',
    assigned_driver_id: '',
    driver_name: '',
    has_telemetry: false,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminLogistics.vehicles.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      vehicle_type: 'caminhao', plate_or_id: '', capacity_kg: '', capacity_m3: '',
      avg_consumption: '', status: 'available', scheduled_maintenance: '', odometer_km: '0',
      assigned_driver_id: '', driver_name: '', has_telemetry: false, notes: ''
    });
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      vehicle_type: item.vehicle_type || 'caminhao',
      plate_or_id: item.plate_or_id || '',
      capacity_kg: item.capacity_kg ?? '',
      capacity_m3: item.capacity_m3 ?? '',
      avg_consumption: item.avg_consumption ?? '',
      status: item.status || 'available',
      scheduled_maintenance: item.scheduled_maintenance ? item.scheduled_maintenance.slice(0, 10) : '',
      odometer_km: String(item.odometer_km ?? 0),
      assigned_driver_id: item.assigned_driver_id || '',
      driver_name: item.driver_name || '',
      has_telemetry: !!item.has_telemetry,
      notes: item.notes || ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = ['capacity_kg', 'capacity_m3', 'avg_consumption', 'odometer_km'].includes(name)
      ? (value ? parseFloat(value, 10) : '')
      : (name === 'has_telemetry' ? e.target.checked : value);
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        capacity_kg: form.capacity_kg || null,
        capacity_m3: form.capacity_m3 || null,
        avg_consumption: form.avg_consumption || null,
        scheduled_maintenance: form.scheduled_maintenance || null,
        odometer_km: parseFloat(form.odometer_km, 10) || 0,
        assigned_driver_id: form.assigned_driver_id || null
      };
      if (editing) {
        await adminLogistics.vehicles.update(editing.id, payload);
        notify.success('Veículo atualizado!');
      } else {
        await adminLogistics.vehicles.create(payload);
        notify.success('Veículo cadastrado!');
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
      await adminLogistics.vehicles.delete(editing.id);
      notify.success('Veículo removido');
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
    { key: 'plate_or_id', label: 'Placa/ID' },
    { key: 'vehicle_type', label: 'Tipo', render: (v) => VEHICLE_TYPES.find(x => x.value === v)?.label || v },
    { key: 'capacity_kg', label: 'Capacidade (kg)' },
    { key: 'status', label: 'Status', render: (v) => STATUS_OPTIONS.find(x => x.value === v)?.label || v },
    { key: 'driver_name_resolved', label: 'Motorista', render: (_, r) => r.driver_name_resolved || r.driver_name || '-' },
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
        <p className="module-desc">Cadastre a frota de veículos (caminhões, vans, empilhadeiras, etc.).</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo Veículo</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum veículo cadastrado" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Veículo' : 'Novo Veículo'} size="medium">
        <div className="generic-form">
          <SelectField label="Tipo" name="vehicle_type" value={form.vehicle_type} onChange={handleChange} options={VEHICLE_TYPES} />
          <InputField label="Placa ou identificação" name="plate_or_id" value={form.plate_or_id} onChange={handleChange} required />
          <div className="form-grid-2">
            <InputField label="Capacidade (kg)" name="capacity_kg" type="number" value={form.capacity_kg} onChange={handleChange} />
            <InputField label="Capacidade (m³)" name="capacity_m3" type="number" value={form.capacity_m3} onChange={handleChange} />
          </div>
          <InputField label="Consumo médio (km/l)" name="avg_consumption" type="number" step="0.01" value={form.avg_consumption} onChange={handleChange} />
          <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={STATUS_OPTIONS} />
          <div className="form-grid-2">
            <InputField label="Manutenção programada" name="scheduled_maintenance" type="date" value={form.scheduled_maintenance} onChange={handleChange} />
            <InputField label="Quilometragem" name="odometer_km" type="number" value={form.odometer_km} onChange={handleChange} />
          </div>
          <SelectField label="Motorista responsável" name="assigned_driver_id" value={form.assigned_driver_id} onChange={handleChange}
            options={[{ value: '', label: '—' }, ...(refs?.drivers || []).filter(d => d.active).map(d => ({ value: d.id, label: d.name }))]} />
          <div className="form-row checkbox-row">
            <input type="checkbox" id="has_telemetry" name="has_telemetry" checked={form.has_telemetry} onChange={handleChange} />
            <label htmlFor="has_telemetry">Possui telemetria/sensores</label>
          </div>
          <TextAreaField label="Observações" name="notes" value={form.notes} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Veículo" size="small">
        <p>Deseja remover este veículo?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: PONTOS LOGÍSTICOS
// ============================================================================
function PointsModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ point_type: 'doca', name: '', code: '', address: '', capacity_kg: '', capacity_m3: '', avg_operation_time_minutes: '', operating_hours: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminLogistics.points.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ point_type: 'doca', name: '', code: '', address: '', capacity_kg: '', capacity_m3: '', avg_operation_time_minutes: '', operating_hours: '' }); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      point_type: item.point_type || 'doca', name: item.name || '', code: item.code || '', address: item.address || '',
      capacity_kg: item.capacity_kg ?? '', capacity_m3: item.capacity_m3 ?? '',
      avg_operation_time_minutes: item.avg_operation_time_minutes ?? '', operating_hours: item.operating_hours || ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = ['capacity_kg', 'capacity_m3', 'avg_operation_time_minutes'].includes(name) ? (value ? parseFloat(value, 10) : '') : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = { ...form, capacity_kg: form.capacity_kg || null, capacity_m3: form.capacity_m3 || null, avg_operation_time_minutes: form.avg_operation_time_minutes || null };
      if (editing) {
        await adminLogistics.points.update(editing.id, payload);
        notify.success('Ponto atualizado!');
      } else {
        await adminLogistics.points.create(payload);
        notify.success('Ponto criado!');
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
      await adminLogistics.points.delete(editing.id);
      notify.success('Ponto removido');
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
    { key: 'point_type', label: 'Tipo', render: (v) => POINT_TYPES.find(x => x.value === v)?.label || v },
    { key: 'code', label: 'Código' },
    { key: 'address', label: 'Endereço', render: (v) => (v || '-').slice(0, 40) },
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
        <p className="module-desc">Docas, armazéns, centros de distribuição, clientes.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo Ponto</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum ponto cadastrado" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Ponto' : 'Novo Ponto'} size="medium">
        <div className="generic-form">
          <SelectField label="Tipo" name="point_type" value={form.point_type} onChange={handleChange} options={POINT_TYPES} />
          <InputField label="Nome" name="name" value={form.name} onChange={handleChange} required />
          <InputField label="Código" name="code" value={form.code} onChange={handleChange} />
          <InputField label="Endereço" name="address" value={form.address} onChange={handleChange} />
          <div className="form-grid-2">
            <InputField label="Capacidade (kg)" name="capacity_kg" type="number" value={form.capacity_kg} onChange={handleChange} />
            <InputField label="Capacidade (m³)" name="capacity_m3" type="number" value={form.capacity_m3} onChange={handleChange} />
          </div>
          <InputField label="Tempo médio operação (min)" name="avg_operation_time_minutes" type="number" value={form.avg_operation_time_minutes} onChange={handleChange} />
          <InputField label="Horários de funcionamento" name="operating_hours" value={form.operating_hours} onChange={handleChange} placeholder="Ex: 08:00-18:00" />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Ponto" size="small">
        <p>Deseja remover este ponto?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: ROTAS
// ============================================================================
function RoutesModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', origin_point_id: '', destination_point_id: '', origin_description: '', destination_description: '', distance_km: '', avg_duration_minutes: '', logistic_risk_level: 'low' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminLogistics.routes.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', origin_point_id: '', destination_point_id: '', origin_description: '', destination_description: '', distance_km: '', avg_duration_minutes: '', logistic_risk_level: 'low' }); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '', origin_point_id: item.origin_point_id || '', destination_point_id: item.destination_point_id || '',
      origin_description: item.origin_description || '', destination_description: item.destination_description || '',
      distance_km: item.distance_km ?? '', avg_duration_minutes: item.avg_duration_minutes ?? '',
      logistic_risk_level: item.logistic_risk_level || 'low'
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = ['distance_km', 'avg_duration_minutes'].includes(name) ? (value ? parseFloat(value, 10) : '') : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        origin_point_id: form.origin_point_id || null,
        destination_point_id: form.destination_point_id || null,
        distance_km: form.distance_km || null,
        avg_duration_minutes: form.avg_duration_minutes || null
      };
      if (editing) {
        await adminLogistics.routes.update(editing.id, payload);
        notify.success('Rota atualizada!');
      } else {
        await adminLogistics.routes.create(payload);
        notify.success('Rota criada!');
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
      await adminLogistics.routes.delete(editing.id);
      notify.success('Rota removida');
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

  const points = refs?.points || [];
  const riskOptions = [{ value: 'low', label: 'Baixo' }, { value: 'medium', label: 'Médio' }, { value: 'high', label: 'Alto' }, { value: 'critical', label: 'Crítico' }];

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'origin_name', label: 'Origem', render: (_, r) => r.origin_name || r.origin_description || '-' },
    { key: 'destination_name', label: 'Destino', render: (_, r) => r.destination_name || r.destination_description || '-' },
    { key: 'distance_km', label: 'Distância (km)' },
    { key: 'avg_duration_minutes', label: 'Tempo médio (min)' },
    { key: 'logistic_risk_level', label: 'Risco', render: (v) => riskOptions.find(x => x.value === v)?.label || v },
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
        <p className="module-desc">Rotas operacionais com origem, destino e métricas.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nova Rota</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhuma rota cadastrada" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Rota' : 'Nova Rota'} size="medium">
        <div className="generic-form">
          <InputField label="Nome da rota" name="name" value={form.name} onChange={handleChange} required />
          <SelectField label="Origem (ponto)" name="origin_point_id" value={form.origin_point_id} onChange={handleChange}
            options={[{ value: '', label: '—' }, ...points.map(p => ({ value: p.id, label: `${p.name} (${POINT_TYPES.find(x => x.value === p.point_type)?.label})` }))]} />
          <SelectField label="Destino (ponto)" name="destination_point_id" value={form.destination_point_id} onChange={handleChange}
            options={[{ value: '', label: '—' }, ...points.map(p => ({ value: p.id, label: `${p.name} (${POINT_TYPES.find(x => x.value === p.point_type)?.label})` }))]} />
          <InputField label="Descrição origem" name="origin_description" value={form.origin_description} onChange={handleChange} />
          <InputField label="Descrição destino" name="destination_description" value={form.destination_description} onChange={handleChange} />
          <div className="form-grid-2">
            <InputField label="Distância (km)" name="distance_km" type="number" step="0.01" value={form.distance_km} onChange={handleChange} />
            <InputField label="Tempo médio (min)" name="avg_duration_minutes" type="number" value={form.avg_duration_minutes} onChange={handleChange} />
          </div>
          <SelectField label="Risco logístico" name="logistic_risk_level" value={form.logistic_risk_level} onChange={handleChange} options={riskOptions} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Rota" size="small">
        <p>Deseja remover esta rota?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}

// ============================================================================
// MÓDULO: MOTORISTAS
// ============================================================================
function DriversModule({ refs, loadRefs }) {
  const notify = useNotification();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', role_type: 'motorista', license_number: '', license_category: '', performance_score: '', occurrence_count: '0', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminLogistics.drivers.list();
      setItems(r.data?.data || []);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', role_type: 'motorista', license_number: '', license_category: '', performance_score: '', occurrence_count: '0', notes: '' }); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '', role_type: item.role_type || 'motorista',
      license_number: item.license_number || '', license_category: item.license_category || '',
      performance_score: item.performance_score ?? '', occurrence_count: String(item.occurrence_count ?? 0), notes: item.notes || ''
    });
    setShowModal(true);
  };
  const openDelete = (item) => { setEditing(item); setShowDelete(true); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = ['performance_score', 'occurrence_count'].includes(name) ? (value ? parseFloat(value, 10) : value) : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        performance_score: form.performance_score || null,
        occurrence_count: parseInt(form.occurrence_count, 10) || 0
      };
      if (editing) {
        await adminLogistics.drivers.update(editing.id, payload);
        notify.success('Motorista atualizado!');
      } else {
        await adminLogistics.drivers.create(payload);
        notify.success('Motorista cadastrado!');
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
      await adminLogistics.drivers.delete(editing.id);
      notify.success('Motorista removido');
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
    { key: 'role_type', label: 'Função', render: (v) => DRIVER_ROLES.find(x => x.value === v)?.label || v },
    { key: 'license_number', label: 'CNH' },
    { key: 'performance_score', label: 'Desempenho' },
    { key: 'occurrence_count', label: 'Ocorrências' },
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
        <p className="module-desc">Motoristas, operadores de empilhadeira e supervisores logísticos.</p>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Novo Motorista</button>
      </div>
      <Table columns={columns} data={items} loading={loading} emptyMessage="Nenhum motorista cadastrado" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Motorista' : 'Novo Motorista'} size="medium">
        <div className="generic-form">
          <InputField label="Nome" name="name" value={form.name} onChange={handleChange} required />
          <SelectField label="Função" name="role_type" value={form.role_type} onChange={handleChange} options={DRIVER_ROLES} />
          <div className="form-grid-2">
            <InputField label="Número CNH" name="license_number" value={form.license_number} onChange={handleChange} />
            <InputField label="Categoria CNH" name="license_category" value={form.license_category} onChange={handleChange} />
          </div>
          <div className="form-grid-2">
            <InputField label="Score de desempenho (0-100)" name="performance_score" type="number" value={form.performance_score} onChange={handleChange} />
            <InputField label="Ocorrências" name="occurrence_count" type="number" value={form.occurrence_count} onChange={handleChange} />
          </div>
          <TextAreaField label="Observações" name="notes" value={form.notes} onChange={handleChange} rows={2} />
        </div>
        <ModalFooter onCancel={() => setShowModal(false)} onConfirm={handleSubmit} confirmText="Salvar" confirmLoading={saving} />
      </Modal>

      <Modal isOpen={showDelete} onClose={() => { setShowDelete(false); setEditing(null); }} title="Remover Motorista" size="small">
        <p>Deseja remover este motorista?</p>
        <ModalFooter onCancel={() => setShowDelete(false)} onConfirm={handleDelete} confirmText="Sim, remover" confirmVariant="danger" confirmLoading={saving} />
      </Modal>
    </div>
  );
}
