/**
 * OPM-008 — Contratos consumo cognitivo (OPM-GOV-001 + OPM-007 · read-only).
 */
export const CL_DATA_CONSUMPTION_CONTRACTS = Object.freeze({
  warehouseIntelligence: Object.freeze({
    moduleId: 'warehouse_intelligence',
    phase: 'OPM-007',
    apiSurface: 'wiAnalytics pipeline (client-side)',
    mode: 'read_only',
    status: 'active',
    signals: ['kpis', 'heatmaps', 'capacity', 'bottlenecks', 'flow', 'recommendations']
  }),
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
  opmGov001: Object.freeze({
    moduleId: 'opm_gov_001',
    phase: 'OPM-GOV-001',
    apiSurface: 'governance contracts (declarative)',
    mode: 'read_only',
    status: 'active'
  })
});

export const CL_DATA_CONSUMPTION_PHASE = 'OPM-008';
