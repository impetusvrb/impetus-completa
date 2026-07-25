/**
 * OPM-006 — Contratos integração (camada transversal — não altera handoffs OPM-GOV-001).
 */
export const TRANSFER_INTEGRATION_CONTRACTS = Object.freeze({
  inventory: Object.freeze({
    moduleId: 'inventory',
    relation: 'internal_location_movement',
    apiSurface: 'POST /v1/inventory/movements',
    movementType: 'transfer',
    referenceType: 'transfer',
    status: 'active',
    targetPhase: 'OPM-006',
    invariant: 'Nunca gera receipt, pick ou issue'
  }),
  warehouses: Object.freeze({
    moduleId: 'warehouses',
    relation: 'origin_destination_locations',
    apiSurface: 'GET /v1/warehouses/:id/locations',
    status: 'active',
    targetPhase: 'OPM-001C'
  }),
  receiving: Object.freeze({
    moduleId: 'receiving',
    relation: 'cross_dock_inbound_source',
    apiSurface: 'GET /v1/receiving',
    status: 'contract_only',
    targetPhase: 'OPM-006',
    note: 'Cross-dock — sem alterar handoff Receiving→Inventory'
  }),
  picking: Object.freeze({
    moduleId: 'picking',
    relation: 'replenishment_demand',
    apiSurface: 'GET /v1/picking',
    status: 'contract_only',
    targetPhase: 'OPM-006',
    note: 'Replenishment — sem alterar handoff Picking→Shipping'
  }),
  shipping: Object.freeze({
    moduleId: 'shipping',
    relation: 'cross_dock_outbound_target',
    apiSurface: 'GET /v1/shipping',
    status: 'contract_only',
    targetPhase: 'OPM-006',
    note: 'Cross-dock — sem alterar handoff Shipping→Inventory issue'
  }),
  warehouseIntelligence: Object.freeze({
    moduleId: 'warehouse_intelligence',
    relation: 'internal_movement_signals',
    apiSurface: 'GET /v1/warehouse/intelligence',
    status: 'active',
    targetPhase: 'OPM-007',
    note: 'Consumidor activo — pipeline client-side'
  }),
  cognitiveLogistics: Object.freeze({
    moduleId: 'cognitive_logistics',
    relation: 'decision_intelligence',
    apiSurface: 'OPM-007 + WMS-003 read-only',
    status: 'active',
    targetPhase: 'OPM-008',
    note: 'Camada cognitiva — sem dependência inversa'
  })
});

/** Princípio arquitectural OPM-006 */
export const TRANSFER_LAYER_PRINCIPLE = Object.freeze({
  role: 'transversal_internal_logistics',
  notABusinessFlow: true,
  preservesOwnership: true,
  doesNotCreateReceiptOrIssue: true,
  doesNotReplaceWarehousePickingInventory: true
});

export const TRANSFER_INTEGRATION_PHASE = 'OPM-006';
