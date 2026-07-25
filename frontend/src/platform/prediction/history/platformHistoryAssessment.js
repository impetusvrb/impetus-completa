/**
 * PRED-BASE-001 — Historical data readiness (platform, read-only).
 */
import { PRED_BASE_001_PHASE, PRED_BASE_STATUS } from '../predBaseConstants.js';

export const PLATFORM_HISTORY_ASSESSMENT = Object.freeze([
  Object.freeze({
    id: 'hist-energy',
    source: 'plant energy / kWh / industrial cost energia',
    owner: 'operations / industrial_cost (shared)',
    historicalHorizon: 'not certified as enterprise series',
    frequency: 'telemetry / cost rollup (plant-dependent)',
    completeness: PRED_BASE_STATUS.NOT_AVAILABLE,
    quality: PRED_BASE_STATUS.PARTIAL,
    readiness: PRED_BASE_STATUS.NOT_AVAILABLE,
    mapsToFinGap: 'GAP-PRED-003',
    note: 'Transversal blocker — not Finance-owned'
  }),
  Object.freeze({
    id: 'hist-production',
    source: 'MES / production drivers / production-demand charts',
    owner: 'MES / production',
    historicalHorizon: 'chart series + MES retention (plant-dependent)',
    frequency: 'MES cadence',
    completeness: PRED_BASE_STATUS.PARTIAL,
    quality: PRED_BASE_STATUS.PARTIAL,
    readiness: PRED_BASE_STATUS.PARTIAL,
    mapsToFinGap: null,
    note: 'Dashboard series exist; enterprise prediction export contract open'
  }),
  Object.freeze({
    id: 'hist-maintenance',
    source: 'ManuIA / predicted_failure / twin diagnostic memory',
    owner: 'maintenance',
    historicalHorizon: 'events ~7d signals + diagnostic memory',
    frequency: 'event-driven',
    completeness: PRED_BASE_STATUS.PARTIAL,
    quality: PRED_BASE_STATUS.PARTIAL,
    readiness: PRED_BASE_STATUS.PARTIAL,
    mapsToFinGap: null,
    note: 'Useful for failure nowcasting; not unified prediction contract'
  }),
  Object.freeze({
    id: 'hist-wms',
    source: 'WMS stock / logistics cognitive',
    owner: 'wms / logistics',
    historicalHorizon: 'transactional + WI/CL heuristics',
    frequency: 'transactional',
    completeness: PRED_BASE_STATUS.PARTIAL,
    quality: PRED_BASE_STATUS.READY,
    readiness: PRED_BASE_STATUS.PARTIAL,
    mapsToFinGap: null,
    note: 'Strong ops data; prediction consumer contract not platform-certified'
  }),
  Object.freeze({
    id: 'hist-costs',
    source: 'industrial_cost_service / dashboard.costs',
    owner: 'industrial_cost (shared ops/finance)',
    historicalHorizon: 'day/month aggregates; multi-period export not certified',
    frequency: 'near-real-time / daily',
    completeness: PRED_BASE_STATUS.PARTIAL,
    quality: PRED_BASE_STATUS.PARTIAL,
    readiness: PRED_BASE_STATUS.PARTIAL,
    mapsToFinGap: 'GAP-PRED-001',
    note: 'Current-state strong; history series for prediction consumers open'
  }),
  Object.freeze({
    id: 'hist-leakage',
    source: 'financialLeakageDetectorService',
    owner: 'finance / ops leakage',
    historicalHorizon: 'alerts + short projected_impact',
    frequency: 'event-driven',
    completeness: PRED_BASE_STATUS.PARTIAL,
    quality: PRED_BASE_STATUS.PARTIAL,
    readiness: PRED_BASE_STATUS.PARTIAL,
    mapsToFinGap: 'GAP-PRED-002',
    note: 'Short-horizon projection ≠ certified trend history'
  }),
  Object.freeze({
    id: 'hist-ops-forecast-inputs',
    source: 'operationalForecastingService inputs',
    owner: 'platform / dashboard',
    historicalHorizon: 'short operational window used by linear projections',
    frequency: 'on demand',
    completeness: PRED_BASE_STATUS.PARTIAL,
    quality: PRED_BASE_STATUS.READY,
    readiness: PRED_BASE_STATUS.PARTIAL,
    mapsToFinGap: 'GAP-PRED-005',
    note: 'Service READY operationally; not yet certified as enterprise prediction baseline contract'
  })
]);

export function getPlatformHistory(id) {
  return PLATFORM_HISTORY_ASSESSMENT.find((h) => h.id === id) || null;
}

export function validatePlatformHistoryAssessment() {
  const issues = [];
  if (PLATFORM_HISTORY_ASSESSMENT.length < 6) issues.push('history assessment incomplete');
  for (const h of PLATFORM_HISTORY_ASSESSMENT) {
    if (!h.owner || !h.historicalHorizon || !h.frequency) {
      issues.push(`${h.id} incomplete`);
    }
    if (!h.readiness) issues.push(`${h.id} missing readiness`);
  }
  const energy = getPlatformHistory('hist-energy');
  if (energy?.readiness !== PRED_BASE_STATUS.NOT_AVAILABLE) {
    issues.push('hist-energy must remain NOT_AVAILABLE');
  }
  return {
    valid: issues.length === 0,
    issues,
    count: PLATFORM_HISTORY_ASSESSMENT.length,
    phase: PRED_BASE_001_PHASE
  };
}
