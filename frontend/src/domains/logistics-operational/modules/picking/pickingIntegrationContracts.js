/**
 * OPM-004 — Contratos de integração (Shipping · Inventário · Armazéns · Recebimento).
 */
export const PICKING_INTEGRATION_CONTRACTS = Object.freeze({
  shipping: Object.freeze({
    moduleId: 'shipping',
    relation: 'outbound_fulfillment_handoff',
    apiSurface: 'POST /v1/shipping',
    status: 'contract_only',
    targetPhase: 'OPM-005'
  }),
  inventory: Object.freeze({
    moduleId: 'inventory',
    relation: 'pick_stock_movement',
    apiSurface: 'POST /v1/inventory/movements',
    movementType: 'pick',
    referenceType: 'picking',
    status: 'active',
    targetPhase: 'OPM-004'
  }),
  warehouses: Object.freeze({
    moduleId: 'warehouses',
    relation: 'pick_locations_routes',
    apiSurface: 'GET /v1/warehouses/:id/locations',
    status: 'active',
    targetPhase: 'OPM-001C'
  }),
  receiving: Object.freeze({
    moduleId: 'receiving',
    relation: 'inbound_to_pick_demand',
    apiSurface: 'GET /v1/receiving',
    status: 'contract_only',
    targetPhase: 'OPM-003'
  })
});

export const PICKING_INTEGRATION_PHASE = 'OPM-004';
