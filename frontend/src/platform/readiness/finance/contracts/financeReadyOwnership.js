/**
 * FIN-READY-001 — Ownership certification for new data contracts.
 * Extends FIN-DATA-001 ownership without duplicating WMS qty or industrial cost.
 */
export const FINANCE_READY_OWNERSHIP = Object.freeze([
  Object.freeze({
    information: 'Driver → Rate mapping (estrutura)',
    owner: 'finance_driver_model',
    ownerPath: 'platform/readiness/finance/driver-model/',
    consumers: Object.freeze(['FIN-EVOLVE-2.1 Smart Costing (future)', 'asset-cost-map links']),
    duplicationForbidden: true,
    doesNotOwn: Object.freeze(['production telemetry', 'energy samples', 'cost calculation runtime'])
  }),
  Object.freeze({
    information: 'Cost ↔ Asset structural link',
    owner: 'finance_asset_cost_map',
    ownerPath: 'platform/readiness/finance/asset-cost-map/',
    consumers: Object.freeze(['FIN-EVOLVE-2.2 Financial Twin overlay (future)']),
    duplicationForbidden: true,
    doesNotOwn: Object.freeze(['digital_twin layout/state', 'industrial cost items'])
  }),
  Object.freeze({
    information: 'Inventory economic valuation (adapter)',
    owner: 'finance_wms_valuation',
    ownerPath: 'platform/readiness/finance/valuation/',
    consumers: Object.freeze(['FIN-EVOLVE-2.1 material carrying', 'FIN-EVOLVE-2.3 inventory $']),
    duplicationForbidden: true,
    doesNotOwn: Object.freeze(['wms_inventory quantities', 'WMS movements']),
    quantityOwnerRemains: 'wms_inventory'
  }),
  Object.freeze({
    information: 'Custo Industrial / operacional',
    owner: 'industrial_cost_service',
    ownerPath: 'backend/src/services/industrialCostService.js',
    consumers: Object.freeze(['Hub KPIs', 'driver cost_origin_ref']),
    duplicationForbidden: true,
    note: 'Unchanged — READY-001 does not fork cost service'
  }),
  Object.freeze({
    information: 'Estoque (quantidade)',
    owner: 'wms_inventory',
    ownerPath: 'domains/logistics-operational/modules/inventory/',
    consumers: Object.freeze(['WMS module', 'finance_wms_valuation adapter']),
    duplicationForbidden: true,
    note: 'Unchanged — valuation is separate owner'
  })
]);

export function validateFinanceReadyOwnership() {
  const issues = [];
  for (const row of FINANCE_READY_OWNERSHIP) {
    if (!row.duplicationForbidden) issues.push(`${row.information}: must forbid duplication`);
    if (!row.owner) issues.push(`${row.information}: missing owner`);
  }
  const owners = FINANCE_READY_OWNERSHIP.map((r) => r.owner);
  for (const required of ['finance_driver_model', 'finance_asset_cost_map', 'finance_wms_valuation', 'wms_inventory', 'industrial_cost_service']) {
    if (!owners.includes(required)) issues.push(`missing ownership row for ${required}`);
  }
  const val = FINANCE_READY_OWNERSHIP.find((r) => r.owner === 'finance_wms_valuation');
  if (val?.quantityOwnerRemains !== 'wms_inventory') {
    issues.push('valuation must keep quantity owner as wms_inventory');
  }
  return { valid: issues.length === 0, issues, rows: FINANCE_READY_OWNERSHIP.length };
}
