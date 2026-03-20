/**
 * IMPETUS - Gestão de Ativos - API (mock quando backend não disponível)
 */
import api from '../../../services/api';

const ASSET_BASE = '/asset-management';

export const assetApi = {
  getTwins: (departmentId) =>
    api.get(`${ASSET_BASE}/twins`, { params: departmentId ? { department_id: departmentId } : {} }).catch(() => ({ data: { twins: getMockTwins() } })),
  getTwin: (id) =>
    api.get(`${ASSET_BASE}/twins/${id}`).catch(() => ({ data: null })),
  simulateFailure: (twinId) =>
    api.post(`${ASSET_BASE}/twins/${twinId}/simulate`).catch(() => ({ data: null })),
  getStock: (params) =>
    api.get(`${ASSET_BASE}/stock`, { params }).catch(() => ({ data: { items: getMockStock() } })),
  updateReorderPoint: (itemId, data) =>
    api.patch(`${ASSET_BASE}/stock/${itemId}`, data).catch(() => ({ data: null })),
  getOrders: (params) =>
    api.get(`${ASSET_BASE}/orders`, { params }).catch(() => ({ data: { orders: getMockOrders() } })),
  approveOrder: (orderId) =>
    api.post(`${ASSET_BASE}/orders/${orderId}/approve`).catch(() => ({ data: null })),
  reassignOrder: (orderId, teamId) =>
    api.post(`${ASSET_BASE}/orders/${orderId}/reassign`, { team_id: teamId }).catch(() => ({ data: null })),
  createOrder: (data) =>
    api.post(`${ASSET_BASE}/orders`, data).catch(() => ({ data: null })),
  createPurchaseOrder: (data) =>
    api.post(`${ASSET_BASE}/stock/purchase-order`, data).catch(() => ({ data: null }))
};

export function getMockTwins() {
  return [
    { id: 'DT-001', machineId: 'M1', name: 'Motor WEG W22 15cv', type: 'motor', department: 'Manutenção',
      sensors: { temperature: 72, vibration: 4.2, efficiency: 88, rpm: 1750 }, status: 'warn',
      prediction: { failureProbability: 45, estimatedFailureIn: '18h', faultParts: ['Rolamento 6205'], aiMessage: 'Vibração acima do normal. Verificar rolamento dianteiro.' },
      history: [68, 69, 70, 71, 72, 72, 71, 70, 71, 72, 73, 72], operatingHours: 12450, lastMaintenance: '2026-02-15' },
    { id: 'DT-002', machineId: 'M2', name: 'Bomba Grundfos CM5', type: 'bomba', department: 'Manutenção',
      sensors: { temperature: 45, vibration: 1.8, efficiency: 95, pressure: 3.2 }, status: 'ok',
      prediction: { failureProbability: 8, estimatedFailureIn: 'OK', faultParts: [], aiMessage: 'Equipamento operando dentro dos parâmetros.' },
      history: [44, 45, 45, 46, 45, 45, 44, 45, 45, 45, 46, 45], operatingHours: 8200, lastMaintenance: '2026-01-20' },
    { id: 'DT-003', machineId: 'M3', name: 'Compressor Atlas Copco', type: 'compressor', department: 'Manutenção',
      sensors: { temperature: 85, vibration: 6.1, efficiency: 72 }, status: 'critical',
      prediction: { failureProbability: 78, estimatedFailureIn: '6h', faultParts: ['Válvula de alívio', 'Filtro de óleo'], aiMessage: 'Temperatura elevada. Inspeção urgente recomendada.' },
      history: [78, 80, 82, 84, 85, 85, 84, 83, 84, 85, 86, 85], operatingHours: 15200, lastMaintenance: '2025-12-10' }
  ];
}

export function getMockStock() {
  return [
    { id: 'S1', code: 'ROL-6205', name: 'Rolamento 6205-2RS', qty: 4, reorderPoint: 6, max: 20, leadTime: 7, consumo90dias: 12 },
    { id: 'S2', code: 'COR-A52', name: 'Correia trapezoidal A52', qty: 2, reorderPoint: 3, max: 15, leadTime: 5, consumo90dias: 6 },
    { id: 'S3', code: 'SEL-M01', name: 'Selo mecânico', qty: 8, reorderPoint: 4, max: 12, leadTime: 10, consumo90dias: 5 },
    { id: 'S4', code: 'FIL-O01', name: 'Filtro de óleo', qty: 1, reorderPoint: 5, max: 10, leadTime: 3, consumo90dias: 8 }
  ];
}

export function getMockOrders() {
  return [
    { id: 'OS-001', machineId: 'M3', machineName: 'Compressor Atlas Copco', priority: 'P1', status: 'pending_approval', type: 'Corretiva Urgente', createdBy: 'IA', createdAt: new Date().toISOString() },
    { id: 'OS-002', machineId: 'M1', machineName: 'Motor WEG W22', priority: 'P3', status: 'open', type: 'Preventiva', teamId: 'T1', createdAt: new Date().toISOString() },
    { id: 'OS-003', machineId: 'M2', machineName: 'Bomba Grundfos', priority: 'P4', status: 'open', type: 'Rotina', teamId: 'T2', createdAt: new Date().toISOString() }
  ];
}
