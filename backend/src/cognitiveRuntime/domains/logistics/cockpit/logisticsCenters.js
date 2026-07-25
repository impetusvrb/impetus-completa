'use strict';

/**
 * INC-041 — Centers + hub mount points (estrutura promovida, hubs funcionais INC-042+).
 */

const LOGISTICS_CENTER_IDS = Object.freeze([
  'logistics_operational_inventory',
  'logistics_inbound_ops',
  'logistics_outbound_ops',
  'logistics_fleet_ops',
  'logistics_telemetry_dock',
  'logistics_traceability',
  'logistics_narrative',
  'logistics_decision_support'
]);

/** center_id → blocos pilot */
const BLOCK_TO_CENTER = Object.freeze({
  'logistics.inventory_health': 'logistics_operational_inventory',
  'logistics.stock_rotation': 'logistics_operational_inventory',
  'logistics.warehouse_capacity': 'logistics_operational_inventory',
  'logistics.receiving_flow': 'logistics_inbound_ops',
  'logistics.picking_efficiency': 'logistics_outbound_ops',
  'logistics.dock_flow': 'logistics_telemetry_dock',
  'logistics.shipment_otif': 'logistics_outbound_ops',
  'logistics.fleet_efficiency': 'logistics_fleet_ops',
  'logistics.route_performance': 'logistics_fleet_ops',
  'logistics.supplier_delivery': 'logistics_traceability',
  'logistics.traceability_bridge': 'logistics_traceability',
  'logistics.contextual_logistics_ai': 'logistics_narrative',
  'logistics.logistics_narrative': 'logistics_narrative'
});

/** hub_key → componente mount point (INC-041 registry) */
const LOGISTICS_HUB_MOUNT_REGISTRY = Object.freeze({
  warehouse_governance: 'WarehouseGovernanceHub',
  inventory_cognitive: 'InventoryCognitiveHub',
  telemetry: 'WarehouseTelemetryHub',
  fleet: 'FleetIntelligenceHub',
  distribution: 'DistributionHub',
  supplier: 'SupplierDeliveryHub',
  cognitive: 'CognitiveLogisticsHub'
});

const CENTER_TO_HUB = Object.freeze({
  logistics_operational_inventory: 'warehouse_governance',
  logistics_inbound_ops: 'supplier',
  logistics_outbound_ops: 'distribution',
  logistics_fleet_ops: 'fleet',
  logistics_telemetry_dock: 'telemetry',
  logistics_traceability: 'supplier',
  logistics_narrative: 'cognitive',
  logistics_decision_support: 'cognitive'
});

function buildLogisticsCenterCatalog() {
  return LOGISTICS_CENTER_IDS.map((center_id) => ({
    center_id,
    label: center_id,
    hub_key: CENTER_TO_HUB[center_id] || null,
    hub_component: LOGISTICS_HUB_MOUNT_REGISTRY[CENTER_TO_HUB[center_id]] || null,
    blocks: [],
    metrics: [],
    foundation_only: true,
    render_ready: false,
    mount_point_only: true
  }));
}

function buildLogisticsCentersFromShadow(shadow = {}, logisticsPilot = {}) {
  const catalog = buildLogisticsCenterCatalog();
  const centerMap = new Map(catalog.map((c) => [c.center_id, { ...c, blocks: [], metrics: [] }]));
  const blocks = shadow.blocks || [];

  for (const block of blocks) {
    const blockId = block.block_id || block.id;
    const centerId = BLOCK_TO_CENTER[blockId];
    if (!centerId || !centerMap.has(centerId)) continue;
    const signals = block.shadow_signals || {};
    if (signals.binding_ok !== true && block.eligible !== true) continue;
    const center = centerMap.get(centerId);
    center.blocks.push(blockId);
    if (signals.metrics && Object.keys(signals.metrics).length) {
      center.metrics.push({ block_id: blockId, ...signals.metrics });
    }
    if (signals.summary) {
      center.summary = center.summary ? `${center.summary} · ${signals.summary}` : signals.summary;
    }
  }

  const boundCount = [...centerMap.values()].filter((c) => c.blocks.length > 0).length;
  const bindingRatio = logisticsPilot?.engine_bridge?.binding_ratio ?? 0;

  return [...centerMap.values()].map((c) => ({
    ...c,
    foundation_only: false,
    mount_point_only: true,
    render_ready: false,
    promotion_inc: 'INC-041',
    specialized: c.blocks.length > 0,
    binding_ratio: bindingRatio
  }));
}

module.exports = {
  LOGISTICS_CENTER_IDS,
  LOGISTICS_HUB_MOUNT_REGISTRY,
  CENTER_TO_HUB,
  buildLogisticsCenterCatalog,
  buildLogisticsCentersFromShadow
};
