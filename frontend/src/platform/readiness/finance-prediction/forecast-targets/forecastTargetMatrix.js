/**
 * FIN-PRED-READY-001 — Official forecast target matrix (indicators that may be predicted later).
 * Specification only — no forecast computation.
 */
import { FIN_PRED_READY_001_PHASE, PRED_READY_STATUS } from '../predReadyConstants.js';

export const FORECAST_TARGET_MATRIX = Object.freeze([
  Object.freeze({
    id: 'ft-total-cost',
    indicator: 'custo_total',
    label: 'Custo total (dia)',
    origin: 'dashboard.costs · economic_performance.costReal',
    dependencies: Object.freeze(['hist-industrial-costs', 'smart_costing']),
    recommendedHorizon: '7–30 days',
    expectedConfidenceBand: 'medium (after history contract)',
    readiness: PRED_READY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'ft-unit-cost',
    indicator: 'custo_unitario',
    label: 'Custo unitário',
    origin: 'smart_costing.unitCost',
    dependencies: Object.freeze(['hist-industrial-costs', 'hist-production', 'financial_drivers']),
    recommendedHorizon: '7–14 days',
    expectedConfidenceBand: 'medium',
    readiness: PRED_READY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'ft-valuation',
    indicator: 'valuation',
    label: 'Valuation de estoque',
    origin: 'finance.wms_valuation.v1',
    dependencies: Object.freeze(['hist-wms-valuation']),
    recommendedHorizon: '1–7 days',
    expectedConfidenceBand: 'low–medium',
    readiness: PRED_READY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'ft-leakage',
    indicator: 'leakage',
    label: 'Tendência de leakage',
    origin: 'dashboard.financialLeakage',
    dependencies: Object.freeze(['hist-leakage']),
    recommendedHorizon: '7–30 days',
    expectedConfidenceBand: 'low–medium',
    readiness: PRED_READY_STATUS.PARTIAL
  }),
  Object.freeze({
    id: 'ft-energy',
    indicator: 'consumo_energetico',
    label: 'Tendência de consumo energético',
    origin: 'drivers.kwh_consumed / byOrigin energia',
    dependencies: Object.freeze(['hist-energy', 'financial_rates']),
    recommendedHorizon: '7–14 days',
    expectedConfidenceBand: 'low until GAP-FD-005 closed',
    readiness: PRED_READY_STATUS.NOT_READY
  }),
  Object.freeze({
    id: 'ft-efficiency',
    indicator: 'eficiencia_economica',
    label: 'Tendência de eficiência económica',
    origin: 'economic_performance.economicEfficiency',
    dependencies: Object.freeze(['hist-industrial-costs', 'economic_performance']),
    recommendedHorizon: '14–30 days',
    expectedConfidenceBand: 'medium',
    readiness: PRED_READY_STATUS.PARTIAL
  })
]);

export function getForecastTarget(id) {
  return FORECAST_TARGET_MATRIX.find((t) => t.id === id) || null;
}

export function listForecastTargetsByStatus(status) {
  return FORECAST_TARGET_MATRIX.filter((t) => t.readiness === status);
}

export function validateForecastTargetMatrix() {
  const issues = [];
  if (FORECAST_TARGET_MATRIX.length < 6) issues.push('forecast targets incomplete');
  const ids = new Set();
  for (const t of FORECAST_TARGET_MATRIX) {
    if (ids.has(t.id)) issues.push(`duplicate ${t.id}`);
    ids.add(t.id);
    if (!t.origin || !t.recommendedHorizon || !t.expectedConfidenceBand) {
      issues.push(`${t.id} incomplete`);
    }
    if (!t.dependencies?.length) issues.push(`${t.id} missing dependencies`);
  }
  for (const ind of [
    'custo_total',
    'custo_unitario',
    'valuation',
    'leakage',
    'consumo_energetico',
    'eficiencia_economica'
  ]) {
    if (!FORECAST_TARGET_MATRIX.some((t) => t.indicator === ind)) {
      issues.push(`missing indicator ${ind}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    count: FORECAST_TARGET_MATRIX.length,
    phase: FIN_PRED_READY_001_PHASE
  };
}
