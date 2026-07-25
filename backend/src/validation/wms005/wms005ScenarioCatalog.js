'use strict';

/**
 * WMS-005 — Catálogo de cenários operacionais integrados (validação only).
 */

const SCENARIOS = Object.freeze([
  {
    id: 'procurement_receiving',
    label: 'Procurement → Receiving',
    flow: ['Supplier', 'PurchaseRequest', 'PurchaseOrder', 'ReceivingOrder', 'InventoryItem'],
    components: ['supply_api', 'pilot_layer', 'wms_ocl', 'canonical_contracts'],
    contracts: ['Supplier', 'PurchaseRequest', 'PurchaseOrder', 'ReceivingOrder'],
    apis: ['POST /supply/v1/purchase-requests', 'POST /supply/v1/purchase-orders', 'GET /logistics-operational/v1/receiving'],
    rbac: ['purchase.request', 'purchase.order', 'receiving.execute'],
    flags: ['IMPETUS_SUPPLY_API', 'IMPETUS_WMS_API_ENABLED']
  },
  {
    id: 'inventory_picking',
    label: 'Inventory → Picking',
    flow: ['InventoryItem', 'InventoryBalance', 'PickingOrder', 'PickingExecution', 'PickingComplete'],
    components: ['wms_ocl', 'wms_api'],
    contracts: ['InventoryItem', 'PickingOrder'],
    apis: ['GET /v1/inventory/items', 'POST /v1/picking', 'POST /v1/picking/:id/execute', 'POST /v1/picking/:id/complete'],
    rbac: ['inventory.read', 'picking.execute'],
    flags: ['IMPETUS_WMS_API_ENABLED', 'IMPETUS_WMS_PICKING_ENABLED']
  },
  {
    id: 'inventory_shipping',
    label: 'Inventory → Shipping',
    flow: ['InventoryItem', 'ShippingOrder', 'ShippingDispatch'],
    components: ['wms_ocl', 'wms_api'],
    contracts: ['InventoryItem', 'ShippingOrder'],
    apis: ['GET /v1/inventory/items', 'POST /v1/shipping', 'POST /v1/shipping/:id/dispatch'],
    rbac: ['inventory.read', 'shipping.execute'],
    flags: ['IMPETUS_WMS_API_ENABLED', 'IMPETUS_WMS_SHIPPING_ENABLED']
  },
  {
    id: 'warehouse_transfer',
    label: 'Transfer Warehouse A → B',
    flow: ['Warehouse', 'TransferOrder', 'TransferComplete'],
    components: ['wms_ocl', 'wms_api'],
    contracts: ['Warehouse', 'TransferOrder'],
    apis: ['POST /v1/transfers', 'POST /v1/transfers/:id/complete'],
    rbac: ['warehouse.read', 'transfer.execute'],
    flags: ['IMPETUS_WMS_API_ENABLED', 'IMPETUS_WMS_TRANSFER_ENABLED']
  },
  {
    id: 'cognitive_integrated',
    label: 'Cognitive Flow Integrated',
    flow: ['SemanticSignal', 'PromotionRuntime', 'PilotIntegrationLayer', 'CanonicalContracts', 'WmsPublicApis', 'OperationalWorkspace'],
    components: ['supply_promotion', 'pilot_layer', 'inc048_convergence', 'wms_workspace_fe', 'supply_workspace_fe'],
    contracts: ['PILOT_CONTRACT_v0.3.0', 'SUPPLY_CONTRACT_v0.2.0'],
    apis: ['pilot/integration', 'inc048/validate'],
    rbac: ['supply.read', 'warehouse.read'],
    flags: ['IMPETUS_INC048_ENABLED', 'IMPETUS_SUPPLY_PILOT_ENABLED']
  }
]);

const SUCCESS_CRITERIA = Object.freeze([
  'contracts_correct',
  'rbac_respected',
  'telemetry_recorded',
  'no_architectural_regression',
  'end_to_end_complete'
]);

function listScenarios() {
  return SCENARIOS;
}

function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}

module.exports = {
  SCENARIOS,
  SUCCESS_CRITERIA,
  listScenarios,
  getScenario
};
