/**
 * FIN-EVOLVE-2.1 — Official contracts the Economic Intelligence Engine may consume.
 * Principle: CALCULATE FROM REGISTERED DATA
 */
export const FIN_EVOLVE_21_PHASE = 'FIN-EVOLVE-2.1';
export const FIN_EVOLVE_21_PRINCIPLE = 'CALCULATE FROM REGISTERED DATA';
export const FIN_EVOLVE_21_RELEASE = '2.1';

/** Public contract IDs — engine MUST NOT bypass these for equivalent data. */
export const ECONOMIC_ENGINE_OFFICIAL_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'finance.driver_rate.v1',
    origin: 'FIN-READY-001',
    role: 'driver→rate structure'
  }),
  Object.freeze({
    id: 'finance.asset_cost_map.v1',
    origin: 'FIN-READY-001',
    role: 'asset↔cost structural links'
  }),
  Object.freeze({
    id: 'finance.wms_valuation.v1',
    origin: 'FIN-READY-001',
    role: 'inventory economic valuation adapter'
  }),
  Object.freeze({
    id: 'dashboard.costs',
    origin: 'industrial_cost_service',
    role: 'industrial operational costs'
  }),
  Object.freeze({
    id: 'dashboard.financialLeakage',
    origin: 'financial_leakage',
    role: 'leakage / economic losses'
  })
]);

/**
 * Technical backlog (HIGH residual from FIN-DATA-001) — extensibility slots.
 * Engine stays valid without them; plug-ins must not break public consumers.
 */
export const ECONOMIC_ENGINE_TECHNICAL_BACKLOG = Object.freeze([
  Object.freeze({
    id: 'GAP-FD-001',
    title: 'Cost impact service public-API certification',
    severity: 'high',
    extensionSlot: 'impactApiProvider',
    status: 'backlog',
    note: 'Use executive-summary.impact_from_events until dedicated route is certified'
  }),
  Object.freeze({
    id: 'GAP-FD-002',
    title: 'Hub KPI field path aliases',
    severity: 'high',
    extensionSlot: 'kpiAliasNormalizer',
    status: 'backlog',
    note: 'Default normalizer in engine; plant-specific aliases via extension'
  }),
  Object.freeze({
    id: 'GAP-FD-005',
    title: 'Energy costing rates per plant',
    severity: 'high',
    extensionSlot: 'plantRateProvider',
    status: 'backlog',
    note: 'driver.rate_value or plantRateProvider(mapping_id); structure ready'
  })
]);

export const FORBIDDEN_IN_EVOLVE_21 = Object.freeze([
  'financial_digital_twin',
  'what_if',
  'simulation_engine',
  'prediction',
  'natural_language',
  'capex_opex',
  'managerial_consolidation'
]);

export function listOfficialContractIds() {
  return ECONOMIC_ENGINE_OFFICIAL_CONTRACTS.map((c) => c.id);
}

export function validateEconomicEngineContracts() {
  const issues = [];
  const ids = new Set();
  for (const c of ECONOMIC_ENGINE_OFFICIAL_CONTRACTS) {
    if (!c.id || !c.origin) issues.push(`incomplete contract entry`);
    if (ids.has(c.id)) issues.push(`duplicate ${c.id}`);
    ids.add(c.id);
  }
  for (const required of [
    'finance.driver_rate.v1',
    'finance.asset_cost_map.v1',
    'finance.wms_valuation.v1',
    'dashboard.costs',
    'dashboard.financialLeakage'
  ]) {
    if (!ids.has(required)) issues.push(`missing official ${required}`);
  }
  if (ECONOMIC_ENGINE_TECHNICAL_BACKLOG.length < 3) issues.push('technical backlog incomplete');
  return { valid: issues.length === 0, issues, count: ECONOMIC_ENGINE_OFFICIAL_CONTRACTS.length };
}
