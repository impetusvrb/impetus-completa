/**
 * FIN-PRED-READY-001 — Historical data assessment (read-only, no source mutation).
 */
import { FIN_PRED_READY_001_PHASE, PRED_READY_STATUS } from '../predReadyConstants.js';

/**
 * Temporal availability of sources that would feed Finance prediction.
 * Values are certification assessments — not live DB probes.
 */
export const FINANCE_HISTORY_ASSESSMENT = Object.freeze([
  Object.freeze({
    id: 'hist-industrial-costs',
    source: 'dashboard.costs / industrial_cost_service',
    periodAvailable: 'operational day/month aggregates; multi-week retention plant-dependent',
    updateFrequency: 'near-real-time / daily rollups',
    completeness: PRED_READY_STATUS.PARTIAL,
    quality: PRED_READY_STATUS.PARTIAL,
    stability: PRED_READY_STATUS.PARTIAL,
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Strong current-state; certified historical series API for Finance forecast not declared'
  }),
  Object.freeze({
    id: 'hist-leakage',
    source: 'dashboard.financialLeakage',
    periodAvailable: 'alerts window + short projected_impact',
    updateFrequency: 'event-driven',
    completeness: PRED_READY_STATUS.PARTIAL,
    quality: PRED_READY_STATUS.PARTIAL,
    stability: PRED_READY_STATUS.PARTIAL,
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Leakage signal rich for nowcasting; insufficient certified long history for trend models'
  }),
  Object.freeze({
    id: 'hist-wms-valuation',
    source: 'finance.wms_valuation.v1 + WMS stock',
    periodAvailable: 'point-in-time stock rows; lot metadata',
    updateFrequency: 'WMS transactional',
    completeness: PRED_READY_STATUS.PARTIAL,
    quality: PRED_READY_STATUS.READY,
    stability: PRED_READY_STATUS.PARTIAL,
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'Quality of valuation adapter good; historical valuation snapshots not Finance-owned'
  }),
  Object.freeze({
    id: 'hist-energy',
    source: 'byOrigin energia + drivers.kwh_consumed',
    periodAvailable: 'session/compose quantities; plant meters external',
    updateFrequency: 'telemetry-dependent',
    completeness: PRED_READY_STATUS.NOT_READY,
    quality: PRED_READY_STATUS.PARTIAL,
    stability: PRED_READY_STATUS.NOT_READY,
    readiness: PRED_READY_STATUS.NOT_READY,
    note: 'GAP-FD-005 plant energy rates/history residual'
  }),
  Object.freeze({
    id: 'hist-production',
    source: 'MES / drivers.units_produced',
    periodAvailable: 'MES ownership; Finance consumes live qty',
    updateFrequency: 'MES cadence',
    completeness: PRED_READY_STATUS.PARTIAL,
    quality: PRED_READY_STATUS.PARTIAL,
    stability: PRED_READY_STATUS.PARTIAL,
    readiness: PRED_READY_STATUS.PARTIAL,
    note: 'History must stay in MES; Finance needs certified export contract for forecast'
  }),
  Object.freeze({
    id: 'hist-drivers-rates',
    source: 'finance.driver_rate.v1',
    periodAvailable: 'declared mappings (structural)',
    updateFrequency: 'configuration',
    completeness: PRED_READY_STATUS.READY,
    quality: PRED_READY_STATUS.READY,
    stability: PRED_READY_STATUS.READY,
    readiness: PRED_READY_STATUS.READY,
    note: 'Schema stable for prediction feature vectors — not a time series by itself'
  }),
  Object.freeze({
    id: 'hist-twin-overlay',
    source: 'FIN-EVOLVE-2.2 Financial Twin State',
    periodAvailable: 'compose-only snapshots (no persistence)',
    updateFrequency: 'on demand',
    completeness: PRED_READY_STATUS.NOT_READY,
    quality: PRED_READY_STATUS.READY,
    stability: PRED_READY_STATUS.PARTIAL,
    readiness: PRED_READY_STATUS.NOT_READY,
    note: 'Twin is representation; must not become prediction store'
  }),
  Object.freeze({
    id: 'hist-whatif',
    source: 'FIN-EVOLVE-2.3 What-if',
    periodAvailable: 'ephemeral scenarios (discarded)',
    updateFrequency: 'user-driven',
    completeness: PRED_READY_STATUS.NOT_READY,
    quality: PRED_READY_STATUS.READY,
    stability: PRED_READY_STATUS.NOT_READY,
    readiness: PRED_READY_STATUS.NOT_READY,
    note: 'Simulated lane only — never train or persist as observed fact'
  }),
  Object.freeze({
    id: 'hist-platform-forecasting',
    source: 'platform forecasting',
    periodAvailable: 'unknown / mount alignment residual',
    updateFrequency: 'unknown',
    completeness: PRED_READY_STATUS.NOT_READY,
    quality: PRED_READY_STATUS.NOT_READY,
    stability: PRED_READY_STATUS.NOT_READY,
    readiness: PRED_READY_STATUS.NOT_READY,
    note: 'GAP-FD-006 — do not treat as Finance predictive source until certified'
  })
]);

export function getHistoryAssessment(id) {
  return FINANCE_HISTORY_ASSESSMENT.find((h) => h.id === id) || null;
}

export function validateFinanceHistoryAssessment() {
  const issues = [];
  if (FINANCE_HISTORY_ASSESSMENT.length < 7) issues.push('history assessment incomplete');
  for (const h of FINANCE_HISTORY_ASSESSMENT) {
    if (!h.periodAvailable || !h.updateFrequency) issues.push(`${h.id} incomplete temporal fields`);
    if (!h.readiness) issues.push(`${h.id} missing readiness`);
  }
  return {
    valid: issues.length === 0,
    issues,
    count: FINANCE_HISTORY_ASSESSMENT.length,
    phase: FIN_PRED_READY_001_PHASE
  };
}
