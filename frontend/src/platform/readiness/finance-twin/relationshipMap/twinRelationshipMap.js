/**
 * FIN-TWIN-READY-001 — Relationship map (READ ONLY).
 * Documents how entities relate — does not alter existing code.
 */
import { TWIN_ENTITY_STATUS } from '../entityCatalog/twinEntityCatalog.js';

/**
 * Directed edges: from → to (composition chain for financial operational state).
 */
export const TWIN_RELATIONSHIP_MAP = Object.freeze([
  Object.freeze({
    id: 'rel-asset-line',
    from: 'asset',
    to: 'production_line',
    via: 'finance.asset_cost_map.v1 (line_id)',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: false
  }),
  Object.freeze({
    id: 'rel-line-cc',
    from: 'production_line',
    to: 'cost_center',
    via: 'finance.asset_cost_map.v1 (cost_center_id)',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: false
  }),
  Object.freeze({
    id: 'rel-cc-cost',
    from: 'cost_center',
    to: 'industrial_cost',
    via: 'cost_origin_ref ↔ dashboard.costs by-origin',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true,
    note: 'Join by label/ref — composition in EconomicIntelligenceEngine'
  }),
  Object.freeze({
    id: 'rel-cost-performance',
    from: 'industrial_cost',
    to: 'economic_performance',
    via: 'FIN-EVOLVE-2.1 runEconomicPerformance',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-asset-smart',
    from: 'asset',
    to: 'smart_costing',
    via: 'asset_cost_map + driver_rate → Smart Costing byAsset',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-driver-cost',
    from: 'driver_rate',
    to: 'industrial_cost',
    via: 'finance.driver_rate.v1 · cost_origin_ref',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-energy-driver',
    from: 'energy_consumption',
    to: 'driver_rate',
    via: 'drv-energy mapping',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    compositionOnly: true,
    note: 'Qty plant-dependent; rates via plantRateProvider backlog'
  }),
  Object.freeze({
    id: 'rel-stock-valuation',
    from: 'inventory_stock',
    to: 'inventory_valuation',
    via: 'finance.wms_valuation.v1 adapter',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-valuation-smart',
    from: 'inventory_valuation',
    to: 'smart_costing',
    via: 'lot / material carrying in Smart Costing',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-leakage-performance',
    from: 'financial_leakage',
    to: 'economic_performance',
    via: 'economic_losses indicator',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-loss-performance',
    from: 'cost_loss',
    to: 'economic_performance',
    via: 'top_loss + projected in performance',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-twin-node-asset',
    from: 'operational_twin_node',
    to: 'asset',
    via: 'twin_node_ref on asset_cost_map',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    compositionOnly: true,
    note: 'Refs optional; 2.2 must compose overlay without mutating twin layout'
  }),
  Object.freeze({
    id: 'rel-order-asset',
    from: 'work_order',
    to: 'asset',
    via: 'MES / ManuIA (uncertified finance join)',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    compositionOnly: true,
    note: 'Needs composition contract in 2.2 — not blocked for MVP twin state'
  }),
  Object.freeze({
    id: 'rel-production-driver',
    from: 'production_signal',
    to: 'driver_rate',
    via: 'volume / utilization / downtime metrics',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    compositionOnly: true
  }),
  Object.freeze({
    id: 'rel-billing-wallet',
    from: 'billing',
    to: 'wallet',
    via: 'nexus billing-engine',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: false,
    note: 'Platform plane — peripheral to plant financial twin'
  }),
  Object.freeze({
    id: 'rel-wallet-ledger',
    from: 'wallet',
    to: 'ledger',
    via: 'billing-ledger',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: false
  }),
  Object.freeze({
    id: 'rel-equipment-asset',
    from: 'equipment',
    to: 'asset',
    via: 'asset_type=equipment in asset_cost_map',
    status: TWIN_ENTITY_STATUS.READY,
    compositionOnly: false
  })
]);

/** Canonical chain documented for Twin composition (not a runtime). */
export const TWIN_CANONICAL_CHAIN = Object.freeze([
  'asset',
  'production_line',
  'cost_center',
  'industrial_cost',
  'economic_performance'
]);

export function listRelationshipsFrom(entityId) {
  return TWIN_RELATIONSHIP_MAP.filter((r) => r.from === entityId);
}

export function listRelationshipsTo(entityId) {
  return TWIN_RELATIONSHIP_MAP.filter((r) => r.to === entityId);
}

export function validateTwinRelationshipMap() {
  const issues = [];
  const ids = new Set();
  for (const r of TWIN_RELATIONSHIP_MAP) {
    if (ids.has(r.id)) issues.push(`duplicate ${r.id}`);
    ids.add(r.id);
    if (!r.from || !r.to || !r.via || !r.status) issues.push(`${r.id} incomplete`);
  }
  if (TWIN_RELATIONSHIP_MAP.length < 12) issues.push('relationship map incomplete');
  for (const step of TWIN_CANONICAL_CHAIN) {
    if (!step) issues.push('canonical chain broken');
  }
  const chainCovered = TWIN_RELATIONSHIP_MAP.some(
    (r) => r.from === 'asset' && r.to === 'production_line'
  ) && TWIN_RELATIONSHIP_MAP.some((r) => r.from === 'cost_center' && r.to === 'industrial_cost');
  if (!chainCovered) issues.push('canonical asset→…→cost path incomplete');
  return { valid: issues.length === 0, issues, count: TWIN_RELATIONSHIP_MAP.length };
}
