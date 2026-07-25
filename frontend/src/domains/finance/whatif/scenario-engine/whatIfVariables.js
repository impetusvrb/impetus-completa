/**
 * FIN-EVOLVE-2.3 — Supported What-if variables (configurable + traceable).
 */
import { FIN_EVOLVE_23_PHASE } from './whatIfConstants.js';

export const WHATIF_VARIABLES = Object.freeze([
  Object.freeze({
    id: 'energy_cost',
    label: 'Custo de energia',
    unit: 'BRL/day or factor',
    appliesTo: 'byOrigin[energia] + plantRateProvider(drv-energy)',
    contracts: Object.freeze(['dashboard.costs', 'finance.driver_rate.v1'])
  }),
  Object.freeze({
    id: 'cost_driver',
    label: 'Driver de custo',
    unit: 'metric quantity',
    appliesTo: 'drivers[metric]',
    contracts: Object.freeze(['finance.driver_rate.v1'])
  }),
  Object.freeze({
    id: 'financial_rate',
    label: 'Rate financeiro',
    unit: 'rate value',
    appliesTo: 'plantRateProvider(mapping_id)',
    contracts: Object.freeze(['finance.driver_rate.v1'])
  }),
  Object.freeze({
    id: 'inventory_valuation',
    label: 'Valuation de estoque',
    unit: 'BRL/unit',
    appliesTo: 'valuationSeed.metadata',
    contracts: Object.freeze(['finance.wms_valuation.v1'])
  }),
  Object.freeze({
    id: 'production_volume',
    label: 'Volume de produção',
    unit: 'units',
    appliesTo: 'drivers.units_produced',
    contracts: Object.freeze(['finance.driver_rate.v1', 'dashboard.costs'])
  }),
  Object.freeze({
    id: 'leakage',
    label: 'Perdas (Leakage)',
    unit: 'BRL projected',
    appliesTo: 'projectedImpact + leakageAlerts',
    contracts: Object.freeze(['dashboard.financialLeakage'])
  }),
  Object.freeze({
    id: 'asset_utilization',
    label: 'Utilização de ativos',
    unit: 'ratio 0–1+',
    appliesTo: 'drivers.utilization_ratio',
    contracts: Object.freeze(['finance.driver_rate.v1', 'finance.asset_cost_map.v1'])
  })
]);

export function listWhatIfVariableIds() {
  return WHATIF_VARIABLES.map((v) => v.id);
}

export function getWhatIfVariable(id) {
  return WHATIF_VARIABLES.find((v) => v.id === id) || null;
}

export function validateWhatIfVariablesCatalog() {
  const issues = [];
  if (WHATIF_VARIABLES.length < 7) issues.push('what-if variables incomplete');
  const ids = new Set();
  for (const v of WHATIF_VARIABLES) {
    if (ids.has(v.id)) issues.push(`duplicate ${v.id}`);
    ids.add(v.id);
    if (!v.contracts?.length) issues.push(`${v.id} missing contracts`);
  }
  return {
    valid: issues.length === 0,
    issues,
    count: WHATIF_VARIABLES.length,
    phase: FIN_EVOLVE_23_PHASE
  };
}
