/**
 * OPM-GOV-001 — Operational Handoff Contracts (congelado).
 * Handoffs certificados OPM-E2E-001.
 */
export const OPM_GOV_001_HANDOFFS = Object.freeze([
  Object.freeze({
    id: 'handoff-receiving-inventory',
    from: Object.freeze({ moduleId: 'receiving', phase: 'OPM-003', event: 'ReceivingCompleted' }),
    to: Object.freeze({ moduleId: 'inventory', phase: 'OPM-002A', event: 'InventoryReceiptCreated' }),
    trigger: Object.freeze({
      sourceStatus: 'completed',
      movementType: 'receipt',
      referenceType: 'receiving'
    }),
    integrationContract: 'RECEIVING_INTEGRATION_CONTRACTS.inventory',
    apiSurface: 'POST /v1/inventory/movements',
    status: 'active'
  }),
  Object.freeze({
    id: 'handoff-inventory-picking',
    from: Object.freeze({ moduleId: 'inventory', phase: 'OPM-002A', event: 'InventoryAvailable' }),
    to: Object.freeze({ moduleId: 'picking', phase: 'OPM-004', event: 'PickingReleased' }),
    trigger: Object.freeze({
      inventoryState: 'available',
      pickingStatus: 'assigned'
    }),
    integrationContract: 'PICKING_INTEGRATION_CONTRACTS.inventory',
    status: 'active'
  }),
  Object.freeze({
    id: 'handoff-picking-shipping',
    from: Object.freeze({ moduleId: 'picking', phase: 'OPM-004', event: 'PickingCompleted' }),
    to: Object.freeze({ moduleId: 'shipping', phase: 'OPM-005', event: 'ShippingReady' }),
    trigger: Object.freeze({
      sourceStatus: 'completed',
      shippingStatus: 'staged',
      metadataLink: 'picking_order_id'
    }),
    integrationContract: 'SHIPPING_INTEGRATION_CONTRACTS.picking',
    status: 'active'
  }),
  Object.freeze({
    id: 'handoff-shipping-inventory',
    from: Object.freeze({ moduleId: 'shipping', phase: 'OPM-005', event: 'ShippingDispatched' }),
    to: Object.freeze({ moduleId: 'inventory', phase: 'OPM-002A', event: 'InventoryIssueCreated' }),
    trigger: Object.freeze({
      sourceStatus: 'shipped',
      movementType: 'issue',
      referenceType: 'shipping'
    }),
    integrationContract: 'SHIPPING_INTEGRATION_CONTRACTS.inventory',
    apiSurface: 'POST /v1/inventory/movements · POST /v1/shipping/:id/dispatch',
    status: 'active'
  })
]);

export function getHandoffById(id) {
  return OPM_GOV_001_HANDOFFS.find((h) => h.id === id) || null;
}

export function getHandoffsForModule(moduleId, direction = 'from') {
  const key = direction === 'from' ? 'from' : 'to';
  return OPM_GOV_001_HANDOFFS.filter((h) => h[key].moduleId === moduleId);
}
