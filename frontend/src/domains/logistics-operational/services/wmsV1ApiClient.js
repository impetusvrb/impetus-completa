/**
 * WMS-004 — Cliente HTTP exclusivo APIs públicas WMS-003 v1.
 * Proibido: acesso directo a domínio interno ou legado.
 */
import { API_URL } from '../../../services/api.js';
import { logWmsUiEvent } from './wmsUiObservability.js';

const BASE = `${API_URL.replace(/\/+$/, '')}/logistics-operational/v1`;

function token() {
  return localStorage.getItem('impetus_token');
}

async function request(method, path, body) {
  const t0 = Date.now();
  const headers = { Authorization: `Bearer ${token()}` };
  const opts = { method, headers, credentials: 'include' };
  if (body != null) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const duration_ms = Date.now() - t0;
  logWmsUiEvent({ method, path, status: res.status, duration_ms, api: 'WMS-003-v1' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `WMS v1 ${method} ${path} → ${res.status}`);
  }
  return res.json();
}

export const wmsV1Api = {
  meta: () => request('GET', '/meta'),
  health: () =>
    fetch(`${API_URL.replace(/\/+$/, '')}/logistics-operational/health`, {
      headers: { Authorization: `Bearer ${token()}` },
      credentials: 'include'
    }).then((r) => r.json()),

  listWarehouses: () => request('GET', '/warehouses'),
  createWarehouse: (body) => request('POST', '/warehouses', body),
  getWarehouse: (id) => request('GET', `/warehouses/${id}`),
  listLocations: (id) => request('GET', `/warehouses/${id}/locations`),
  warehouseCapacity: (id) => request('GET', `/warehouses/${id}/capacity`),

  listItems: () => request('GET', '/inventory/items'),
  listBalances: () => request('GET', '/inventory/balances'),
  listMovements: () => request('GET', '/inventory/movements'),

  listReceiving: () => request('GET', '/receiving'),
  createReceiving: (body) => request('POST', '/receiving', body),
  getReceiving: (id) => request('GET', `/receiving/${id}`),
  updateReceivingStatus: (id, status) => request('PATCH', `/receiving/${id}/status`, { status }),
  createMovement: (body) => request('POST', '/inventory/movements', body),
  listPicking: () => request('GET', '/picking'),
  createPicking: (body) => request('POST', '/picking', body),
  getPicking: (id) => request('GET', `/picking/${id}`),
  executePicking: (id) => request('POST', `/picking/${id}/execute`),
  completePicking: (id) => request('POST', `/picking/${id}/complete`),
  listShipping: () => request('GET', '/shipping'),
  createShipping: (body) => request('POST', '/shipping', body),
  getShipping: (id) => request('GET', `/shipping/${id}`),
  dispatchShipping: (id) => request('POST', `/shipping/${id}/dispatch`),
  listTransfers: () => request('GET', '/transfers'),
  createTransfer: (body) => request('POST', '/transfers', body),
  getTransfer: (id) => request('GET', `/transfers/${id}`),
  completeTransfer: (id) => request('POST', `/transfers/${id}/complete`)
};

export default wmsV1Api;
