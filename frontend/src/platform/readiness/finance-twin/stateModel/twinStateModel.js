/**
 * FIN-TWIN-READY-001 — Financial Twin state model (READ ONLY).
 * Defines which attributes represent twin state — does NOT compute new indicators.
 */
import { TWIN_ENTITY_STATUS } from '../entityCatalog/twinEntityCatalog.js';

/**
 * Attributes that will constitute the Financial Twin state in FIN-EVOLVE-2.2.
 * sourceCapability = existing producer; twin consumes via composition.
 */
export const TWIN_STATE_ATTRIBUTES = Object.freeze([
  Object.freeze({
    id: 'current_cost',
    label: 'Custo corrente',
    entityRefs: Object.freeze(['industrial_cost', 'smart_costing']),
    sourceCapability: 'dashboard.costs · EconomicIntelligenceEngine.unitCost / costReal',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'accumulated_cost',
    label: 'Custo acumulado',
    entityRefs: Object.freeze(['industrial_cost']),
    sourceCapability: 'dashboard.costs operational.per_month / by-origin',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'losses',
    label: 'Perdas',
    entityRefs: Object.freeze(['cost_loss', 'financial_leakage']),
    sourceCapability: 'top-loss · leakage · economic_losses',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'efficiency',
    label: 'Eficiência económica',
    entityRefs: Object.freeze(['economic_performance']),
    sourceCapability: 'FIN-EVOLVE-2.1 economic_efficiency',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'valuation',
    label: 'Valuation de estoque',
    entityRefs: Object.freeze(['inventory_valuation']),
    sourceCapability: 'finance.wms_valuation.v1',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'consumption',
    label: 'Consumo (energia / material / volume)',
    entityRefs: Object.freeze(['energy_consumption', 'driver_rate', 'production_signal']),
    sourceCapability: 'finance.driver_rate.v1 + MES/IoT quantities',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    computesNew: false,
    note: 'Quantities plant-dependent'
  }),
  Object.freeze({
    id: 'financial_impact',
    label: 'Impacto financeiro',
    entityRefs: Object.freeze(['industrial_cost', 'financial_leakage']),
    sourceCapability: 'impact_from_events · projected-impact (GAP-FD-001 extensible)',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    computesNew: false
  }),
  Object.freeze({
    id: 'operational_risk',
    label: 'Risco operacional (financeiro)',
    entityRefs: Object.freeze(['financial_leakage', 'cost_loss', 'economic_performance']),
    sourceCapability: 'leakage alerts severity + losses compose',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    computesNew: false,
    note: 'No dedicated risk engine — compose from alerts/losses in 2.2'
  }),
  Object.freeze({
    id: 'cost_by_asset',
    label: 'Custo por activo',
    entityRefs: Object.freeze(['asset', 'smart_costing']),
    sourceCapability: 'Smart Costing byAsset',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'cost_by_line',
    label: 'Custo por linha',
    entityRefs: Object.freeze(['production_line', 'smart_costing']),
    sourceCapability: 'Smart Costing byLine',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'cost_by_cost_center',
    label: 'Custo por centro de custo',
    entityRefs: Object.freeze(['cost_center', 'smart_costing']),
    sourceCapability: 'Smart Costing byCostCenter',
    status: TWIN_ENTITY_STATUS.READY,
    computesNew: false
  }),
  Object.freeze({
    id: 'spatial_ref',
    label: 'Referência espacial (twin node)',
    entityRefs: Object.freeze(['operational_twin_node', 'asset']),
    sourceCapability: 'digital_twin layout + twin_node_ref',
    status: TWIN_ENTITY_STATUS.PARTIAL,
    computesNew: false
  })
]);

export const TWIN_STATE_MODEL = Object.freeze({
  id: 'finance.twin_state.v0',
  phase: 'FIN-TWIN-READY-001',
  purpose: 'Declare attributes of living financial operational state — no runtime twin',
  attributes: TWIN_STATE_ATTRIBUTES,
  forbidden: Object.freeze([
    'new_indicator_calculation',
    'twin_runtime',
    'simulation',
    'what_if',
    'prediction'
  ])
});

export function validateTwinStateModel() {
  const issues = [];
  if (TWIN_STATE_MODEL.attributes.length < 8) issues.push('state model incomplete');
  for (const a of TWIN_STATE_ATTRIBUTES) {
    if (a.computesNew) issues.push(`${a.id} must not compute new indicators`);
    if (!a.sourceCapability) issues.push(`${a.id} missing source`);
    if (!a.entityRefs?.length) issues.push(`${a.id} missing entityRefs`);
  }
  const required = ['current_cost', 'losses', 'efficiency', 'valuation', 'financial_impact'];
  for (const id of required) {
    if (!TWIN_STATE_ATTRIBUTES.some((a) => a.id === id)) issues.push(`missing attr ${id}`);
  }
  return { valid: issues.length === 0, issues, count: TWIN_STATE_ATTRIBUTES.length };
}
