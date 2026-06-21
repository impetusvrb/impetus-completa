/**
 * IMPETUS - Gestão de Ativos — API (sem fallback mock silencioso)
 */
import api from '../../../services/api';

const ASSET_BASE = '/asset-management';

export const assetApi = {
  getTwins: (departmentId) =>
    api.get(`${ASSET_BASE}/twins`, { params: departmentId ? { department_id: departmentId } : {} }),
  getTwin: (id) =>
    api.get(`${ASSET_BASE}/twins/${id}`),
  simulateFailure: (twinId) =>
    api.post(`${ASSET_BASE}/twins/${twinId}/simulate`),
  getStock: (params) =>
    api.get(`${ASSET_BASE}/stock`, { params }),
  updateReorderPoint: (itemId, data) =>
    api.patch(`${ASSET_BASE}/stock/${itemId}`, data),
  getOrders: (params) =>
    api.get(`${ASSET_BASE}/orders`, { params }),
  approveOrder: (orderId) =>
    api.post(`${ASSET_BASE}/orders/${orderId}/approve`),
  reassignOrder: (orderId, teamId) =>
    api.post(`${ASSET_BASE}/orders/${orderId}/reassign`, { team_id: teamId }),
  createOrder: (data) =>
    api.post(`${ASSET_BASE}/orders`, data),
  createPurchaseOrder: (data) =>
    api.post(`${ASSET_BASE}/stock/purchase-order`, data)
};
