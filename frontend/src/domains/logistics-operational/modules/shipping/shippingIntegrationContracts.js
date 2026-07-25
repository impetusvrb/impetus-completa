/**
 * OPM-005 — Contratos de integração (Picking · Inventário · Armazéns · TMS/Yard futuro).
 */
export const SHIPPING_INTEGRATION_CONTRACTS = Object.freeze({
  picking: Object.freeze({
    moduleId: 'picking',
    relation: 'fulfillment_handoff',
    apiSurface: 'GET /v1/picking · POST /v1/picking/:id/complete',
    status: 'active',
    targetPhase: 'OPM-004'
  }),
  inventory: Object.freeze({
    moduleId: 'inventory',
    relation: 'outbound_stock_movement',
    apiSurface: 'POST /v1/inventory/movements',
    movementType: 'issue',
    referenceType: 'shipping',
    status: 'active',
    targetPhase: 'OPM-005'
  }),
  warehouses: Object.freeze({
    moduleId: 'warehouses',
    relation: 'outbound_dock_locations',
    apiSurface: 'GET /v1/warehouses/:id/locations',
    status: 'active',
    targetPhase: 'OPM-001C'
  }),
  transportManagement: Object.freeze({
    moduleId: 'transport',
    relation: 'carrier_vehicle_assignment',
    apiSurface: 'GET /transport/shipments',
    status: 'contract_only',
    targetPhase: 'OPM-005+'
  }),
  yardManagement: Object.freeze({
    moduleId: 'yard',
    relation: 'yard_dock_scheduling',
    apiSurface: 'GET /yard/docks',
    status: 'contract_only',
    targetPhase: 'OPM-007+'
  })
});

export const SHIPPING_INTEGRATION_PHASE = 'OPM-005';
