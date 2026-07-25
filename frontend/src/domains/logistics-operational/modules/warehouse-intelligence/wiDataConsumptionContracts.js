/**
 * OPM-007 — Contratos consumo de dados (read-only · sem alterar handoffs OPM-GOV-001).
 */
export const WI_DATA_CONSUMPTION_CONTRACTS = Object.freeze({
  inventory: Object.freeze({
    moduleId: 'inventory',
    phase: 'OPM-002A',
    apiSurface: 'GET /v1/inventory/balances · GET /v1/inventory/movements',
    mode: 'read_only',
    status: 'active'
  }),
  receiving: Object.freeze({
    moduleId: 'receiving',
    phase: 'OPM-003',
    apiSurface: 'GET /v1/receiving',
    mode: 'read_only',
    status: 'active'
  }),
  picking: Object.freeze({
    moduleId: 'picking',
    phase: 'OPM-004',
    apiSurface: 'GET /v1/picking',
    mode: 'read_only',
    status: 'active'
  }),
  shipping: Object.freeze({
    moduleId: 'shipping',
    phase: 'OPM-005',
    apiSurface: 'GET /v1/shipping',
    mode: 'read_only',
    status: 'active'
  }),
  transfers: Object.freeze({
    moduleId: 'transfers',
    phase: 'OPM-006',
    apiSurface: 'GET /v1/transfers',
    mode: 'read_only',
    status: 'active'
  }),
  warehouses: Object.freeze({
    moduleId: 'warehouses',
    phase: 'OPM-001C',
    apiSurface: 'GET /v1/warehouses · GET /v1/warehouses/:id/capacity',
    mode: 'read_only',
    status: 'active'
  })
});

export const WI_DATA_CONSUMPTION_PHASE = 'OPM-007';
