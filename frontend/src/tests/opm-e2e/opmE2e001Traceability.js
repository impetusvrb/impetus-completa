/**
 * OPM-E2E-001 — Matriz de rastreabilidade (requisito → validação).
 */
export const E2E_TRACEABILITY_MATRIX = Object.freeze([
  { req: 'ASN → Receiving', module: 'OPM-003', validation: 'buildReceivingRows + resolveReceivingOperationalStatus' },
  { req: 'Inventory Receipt', module: 'OPM-002A', validation: 'movement_type receipt + buildInventoryTimeline' },
  { req: 'Warehouse Location', module: 'OPM-001C', validation: 'warehouse_id + dock metadata' },
  { req: 'Picking', module: 'OPM-004', validation: 'resolvePickingOperationalStatus + pick movement' },
  { req: 'Inventory Pick', module: 'OPM-002A', validation: 'movement_type pick' },
  { req: 'Shipping', module: 'OPM-005', validation: 'resolveShippingOperationalStatus + linkCompletedPickingOrders' },
  { req: 'Inventory Issue', module: 'OPM-002A', validation: 'movement_type issue' },
  { req: 'Completed', module: 'E2E', validation: 'assertFinalStates shipped/completed' },
  { req: 'Receiving → Inventory', contract: 'RECEIVING_INTEGRATION_CONTRACTS.inventory', validation: 'movementType receipt active' },
  { req: 'Inventory → Picking', contract: 'PICKING_INTEGRATION_CONTRACTS.inventory', validation: 'movementType pick active' },
  { req: 'Picking → Shipping', contract: 'SHIPPING_INTEGRATION_CONTRACTS.picking', validation: 'fulfillment_handoff active' },
  { req: 'Shipping → Inventory', contract: 'SHIPPING_INTEGRATION_CONTRACTS.inventory', validation: 'movementType issue active' },
  { req: 'RECEIVING_* observability', validation: 'trackReceivingCompleted / DIVERGENCE' },
  { req: 'PICKING_* observability', validation: 'trackPickingStarted / COMPLETED / DIVERGENCE' },
  { req: 'SHIPPING_* observability', validation: 'trackShippingDispatched / DIVERGENCE' },
  { req: 'INVENTORY_* observability', validation: 'trackInventoryTimeline' },
  { req: 'EOX Header/Breadcrumb', validation: 'resolveLogisticsOperationalNavigation phases' },
  { req: 'Performance grids', validation: 'opmE2e001PerformanceBench thresholds' }
]);

export function getTraceabilityCoverage() {
  return {
    totalRequirements: E2E_TRACEABILITY_MATRIX.length,
    modules: ['OPM-003', 'OPM-002A', 'OPM-001C', 'OPM-004', 'OPM-005'],
    scenarios: 4
  };
}
