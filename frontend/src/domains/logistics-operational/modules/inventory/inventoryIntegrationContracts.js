/**
 * OPM-002A — Contratos de integração futura (Receiving, Warehouse, Picking…).
 * Declarativo — sem implementação nesta fase.
 */
export const INVENTORY_INTEGRATION_CONTRACTS = Object.freeze({
  receiving: Object.freeze({
    moduleId: 'receiving',
    relation: 'inbound_movements',
    apiSurface: 'GET /v1/receiving · POST /v1/inventory/movements',
    status: 'active',
    targetPhase: 'OPM-003'
  }),
  warehouse: Object.freeze({
    moduleId: 'warehouses',
    relation: 'location_balances',
    apiSurface: 'GET /v1/warehouses/:id/locations',
    status: 'active',
    targetPhase: 'OPM-001C'
  }),
  picking: Object.freeze({
    moduleId: 'picking',
    relation: 'reservation_demand',
    apiSurface: 'GET /v1/picking',
    status: 'planned',
    targetPhase: 'OPM-004'
  }),
  shipping: Object.freeze({
    moduleId: 'shipping',
    relation: 'outbound_demand',
    apiSurface: 'GET /v1/shipping',
    status: 'planned',
    targetPhase: 'OPM-005'
  }),
  transfers: Object.freeze({
    moduleId: 'transfers',
    relation: 'inter_warehouse_moves',
    apiSurface: 'GET /v1/transfers · POST /v1/inventory/movements',
    movementType: 'transfer',
    status: 'active',
    targetPhase: 'OPM-006'
  }),
  warehouseIntelligence: Object.freeze({
    moduleId: 'warehouse_intelligence',
    relation: 'operational_signals',
    apiSurface: 'GET /v1/warehouses · GET /v1/inventory/* · GET /v1/receiving · GET /v1/picking · GET /v1/shipping · GET /v1/transfers',
    status: 'active',
    targetPhase: 'OPM-007',
    mode: 'read_only'
  }),
  cognitiveLogistics: Object.freeze({
    moduleId: 'cognitive_logistics',
    relation: 'decision_intelligence',
    apiSurface: 'OPM-007 pipeline + WMS-003 read-only',
    status: 'active',
    targetPhase: 'OPM-008',
    mode: 'read_only'
  })
});

export const INVENTORY_INTEGRATION_PHASE = 'OPM-002A';
