/**
 * OPM-003 — Contratos de integração (Qualidade · Inventário · Supply).
 * Declarativo — regras de domínio em fases posteriores.
 */
export const RECEIVING_INTEGRATION_CONTRACTS = Object.freeze({
  quality: Object.freeze({
    moduleId: 'quality',
    relations: ['ppap', 'receiving_inspection', 'quality_hold', 'quarantine_release'],
    apiSurface: 'GET /quality/inspections · POST /quality/hold',
    status: 'contract_only',
    targetPhase: 'OPM-003+'
  }),
  inventory: Object.freeze({
    moduleId: 'inventory',
    relation: 'inbound_stock_movement',
    apiSurface: 'POST /v1/inventory/movements',
    movementType: 'receipt',
    referenceType: 'receiving',
    status: 'active',
    targetPhase: 'OPM-003'
  }),
  supply: Object.freeze({
    moduleId: 'supply',
    relation: 'purchase_order_asn',
    apiSurface: 'GET /supply/purchase-orders',
    status: 'contract_only',
    targetPhase: 'OPM-003+'
  }),
  warehouses: Object.freeze({
    moduleId: 'warehouses',
    relation: 'dock_locations',
    apiSurface: 'GET /v1/warehouses/:id/locations',
    status: 'active',
    targetPhase: 'OPM-001C'
  })
});

export const RECEIVING_INTEGRATION_PHASE = 'OPM-003';
