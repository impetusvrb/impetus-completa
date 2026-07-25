/**
 * FIN-PRED-READY-001 — Predictable capability inventory (read-only).
 */
import {
  FIN_PRED_READY_001_PHASE,
  FIN_PRED_READY_001_PRINCIPLE,
  PRED_READY_STATUS
} from '../predReadyConstants.js';

/**
 * Capabilities that could feed future prediction — classified READY | PARTIAL | NOT_READY.
 * No algorithms; assessment of certified surfaces only.
 */
export const PREDICTABLE_CAPABILITY_INVENTORY = Object.freeze([
  Object.freeze({
    id: 'smart_costing',
    label: 'Smart Costing',
    origin: 'FIN-EVOLVE-2.1',
    contracts: Object.freeze(['finance.driver_rate.v1', 'dashboard.costs']),
    historySignal: 'operational costs + driver contributions (session/compose)',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Deterministic composition exists; certified multi-period history series not yet a Finance contract'
  }),
  Object.freeze({
    id: 'economic_performance',
    label: 'Performance Económica',
    origin: 'FIN-EVOLVE-2.1',
    contracts: Object.freeze(['dashboard.costs', 'dashboard.financialLeakage']),
    historySignal: 'efficiency / losses / consolidated indicators',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Indicators explainable today; temporal depth depends on costs/leakage retention'
  }),
  Object.freeze({
    id: 'financial_leakage',
    label: 'Leakage',
    origin: 'dashboard.financialLeakage / REG-002',
    contracts: Object.freeze(['dashboard.financialLeakage']),
    historySignal: 'alerts + projected_impact (short horizon)',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Projected impact exists; trend series contract for Finance prediction not certified'
  }),
  Object.freeze({
    id: 'wms_valuation',
    label: 'WMS Valuation',
    origin: 'FIN-READY-001',
    contracts: Object.freeze(['finance.wms_valuation.v1']),
    historySignal: 'lot/average cost adapter on stock rows',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Valuation adapter READY; historical valuation snapshots not owned by Finance'
  }),
  Object.freeze({
    id: 'energy',
    label: 'Energia',
    origin: 'driver_rate + byOrigin energia',
    contracts: Object.freeze(['finance.driver_rate.v1', 'dashboard.costs']),
    historySignal: 'kwh_consumed / energia day costs',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Rates + by-origin available; plant energy time-series certification residual (GAP-FD-005)'
  }),
  Object.freeze({
    id: 'production',
    label: 'Produção',
    origin: 'MES / drivers.units_produced',
    contracts: Object.freeze(['finance.driver_rate.v1']),
    historySignal: 'units_produced driver quantity',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Driver structure READY; production history ownership remains MES — Finance consumes'
  }),
  Object.freeze({
    id: 'asset_utilization',
    label: 'Utilização de ativos',
    origin: 'drivers.utilization_ratio + asset_cost_map',
    contracts: Object.freeze(['finance.driver_rate.v1', 'finance.asset_cost_map.v1']),
    historySignal: 'utilization_ratio + asset links',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Structural links READY; utilization telemetry history not Finance-owned'
  }),
  Object.freeze({
    id: 'financial_drivers',
    label: 'Drivers financeiros',
    origin: 'FIN-READY-001 driver_rate',
    contracts: Object.freeze(['finance.driver_rate.v1']),
    historySignal: 'mapping_id → metric → rate_value',
    readiness: PRED_READY_STATUS.READY,
    note: 'Contract certified; sufficient for prediction input schema (not the model itself)'
  }),
  Object.freeze({
    id: 'financial_rates',
    label: 'Rates',
    origin: 'driver_rate + plantRateProvider slot',
    contracts: Object.freeze(['finance.driver_rate.v1']),
    historySignal: 'declared rates / plant overrides',
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Rate contract READY; plant-specific rate history still backlog GAP-FD-005'
  }),
  Object.freeze({
    id: 'whatif_scenarios',
    label: 'What-if scenarios (input lane)',
    origin: 'FIN-EVOLVE-2.3',
    contracts: Object.freeze(['EconomicIntelligenceEngine', 'FinancialTwinState']),
    historySignal: 'temporary scenario compositions (discarded)',
    readiness: PRED_READY_STATUS.READY,
    note: 'Not a forecast source — defines simulated_scenario lane for contrast with prediction'
  }),
  Object.freeze({
    id: 'financial_twin_state',
    label: 'Financial Twin State',
    origin: 'FIN-EVOLVE-2.2',
    contracts: Object.freeze(['finance.asset_cost_map.v1', 'EconomicIntelligenceEngine']),
    historySignal: 'composed economic overlay on industrial twin',
    readiness: PRED_READY_STATUS.READY,
    note: 'Representation lane READY for attaching future forecast overlays without parallel twin'
  }),
  Object.freeze({
    id: 'platform_forecasting',
    label: 'Platform forecasting service',
    origin: 'FIN-DATA-001 inventory',
    contracts: Object.freeze(['forecasting.projections (platform)']),
    historySignal: 'generic projections / alerts',
    readiness: PRED_READY_STATUS.NOT_READY,
    note: 'GAP-FD-006 — not certified as Finance predictive contract'
  })
]);

export function getPredictableCapability(id) {
  return PREDICTABLE_CAPABILITY_INVENTORY.find((c) => c.id === id) || null;
}

export function listPredictableByStatus(status) {
  return PREDICTABLE_CAPABILITY_INVENTORY.filter((c) => c.readiness === status);
}

export function validateFinancePredictionInventory() {
  const issues = [];
  if (PREDICTABLE_CAPABILITY_INVENTORY.length < 9) issues.push('inventory incomplete');
  const ids = new Set();
  for (const c of PREDICTABLE_CAPABILITY_INVENTORY) {
    if (ids.has(c.id)) issues.push(`duplicate ${c.id}`);
    ids.add(c.id);
    if (!Object.values(PRED_READY_STATUS).includes(c.readiness)) {
      issues.push(`${c.id} invalid readiness`);
    }
    if (!c.contracts?.length) issues.push(`${c.id} missing contracts`);
  }
  for (const required of [
    'smart_costing',
    'economic_performance',
    'financial_leakage',
    'wms_valuation',
    'energy',
    'production',
    'asset_utilization',
    'financial_drivers',
    'financial_rates'
  ]) {
    if (!ids.has(required)) issues.push(`missing required ${required}`);
  }
  return {
    valid: issues.length === 0,
    issues,
    count: PREDICTABLE_CAPABILITY_INVENTORY.length,
    phase: FIN_PRED_READY_001_PHASE,
    principle: FIN_PRED_READY_001_PRINCIPLE
  };
}
