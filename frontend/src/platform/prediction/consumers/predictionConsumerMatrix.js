/**
 * PRED-BASE-001 — Domain consumer matrix for future enterprise prediction.
 * Updated after PRED-BASE-002: GAP-PB-005 closed; GAP-PB-003 = energy coverage deferral.
 */
import { PRED_BASE_001_PHASE, PRED_BASE_STATUS } from '../predBaseConstants.js';

export const PREDICTION_CONSUMER_MATRIX = Object.freeze([
  Object.freeze({
    id: 'consumer-finance',
    domain: 'finance',
    label: 'Finance',
    readinessProgram: 'FIN-PRED-READY-001',
    futureProduct: 'FIN-EVOLVE-2.4',
    dependencies: Object.freeze([
      'platform.prediction.v0',
      'hist-costs',
      'hist-leakage',
      'PRED-BASE-002 certification',
      'hist-energy (optional/scoped)'
    ]),
    requirements: Object.freeze([
      'PREDICT WITHOUT DECIDING',
      'semantic lanes',
      'consume Economic Intelligence / Twin / What-if — do not fork engines'
    ]),
    consumerReadiness: PRED_BASE_STATUS.READY,
    blockedBy: Object.freeze([]),
    coverageDeferred: Object.freeze(['GAP-PB-003'])
  }),
  Object.freeze({
    id: 'consumer-maintenance',
    domain: 'maintenance',
    label: 'Maintenance',
    readinessProgram: null,
    futureProduct: 'domain predictive overlays on ManuIA / twin diagnostic',
    dependencies: Object.freeze(['platform.prediction.v0', 'hist-maintenance', 'digital_twin_state']),
    requirements: Object.freeze(['failure predictions as forecast_prediction lane', 'no auto WO execution']),
    consumerReadiness: PRED_BASE_STATUS.READY,
    blockedBy: Object.freeze([]),
    coverageDeferred: Object.freeze([])
  }),
  Object.freeze({
    id: 'consumer-production',
    domain: 'production',
    label: 'Production',
    readinessProgram: null,
    futureProduct: 'efficiency / throughput forecast consumer',
    dependencies: Object.freeze(['platform.prediction.v0', 'hist-production', 'dashboard_chart_series']),
    requirements: Object.freeze(['MES history export contract', 'semantic lanes']),
    consumerReadiness: PRED_BASE_STATUS.READY,
    blockedBy: Object.freeze([]),
    coverageDeferred: Object.freeze([])
  }),
  Object.freeze({
    id: 'consumer-logistics',
    domain: 'logistics',
    label: 'Logistics / WMS',
    readinessProgram: 'CPL predictive_insights (WMS)',
    futureProduct: 'demand / replenishment forecast consumer',
    dependencies: Object.freeze(['platform.prediction.v0', 'hist-wms', 'clPredictiveUtils pattern']),
    requirements: Object.freeze(['reuse CPL recommendation/predictive patterns', 'no parallel engine']),
    consumerReadiness: PRED_BASE_STATUS.READY,
    blockedBy: Object.freeze([]),
    coverageDeferred: Object.freeze([])
  }),
  Object.freeze({
    id: 'consumer-quality',
    domain: 'quality',
    label: 'Quality',
    readinessProgram: null,
    futureProduct: 'defect / inspection trend consumer',
    dependencies: Object.freeze(['platform.prediction.v0', 'quality telemetry history']),
    requirements: Object.freeze(['domain history certification', 'predict without deciding']),
    consumerReadiness: PRED_BASE_STATUS.PARTIAL,
    blockedBy: Object.freeze(['GAP-PB-007']),
    coverageDeferred: Object.freeze([])
  }),
  Object.freeze({
    id: 'consumer-environment',
    domain: 'environment',
    label: 'Environment',
    readinessProgram: null,
    futureProduct: 'environmental / energy-adjacent forecast consumer',
    dependencies: Object.freeze(['platform.prediction.v0', 'environment telemetry', 'hist-energy']),
    requirements: Object.freeze(['energy history certification for energy-linked forecasts']),
    consumerReadiness: PRED_BASE_STATUS.PARTIAL,
    blockedBy: Object.freeze([]),
    coverageDeferred: Object.freeze(['GAP-PB-003'])
  }),
  Object.freeze({
    id: 'consumer-safety',
    domain: 'safety',
    label: 'Safety',
    readinessProgram: null,
    futureProduct: 'incident risk forecast consumer',
    dependencies: Object.freeze(['platform.prediction.v0', 'safety telemetry history']),
    requirements: Object.freeze(['domain history certification', 'no auto mitigation']),
    consumerReadiness: PRED_BASE_STATUS.PARTIAL,
    blockedBy: Object.freeze(['GAP-PB-007']),
    coverageDeferred: Object.freeze([])
  })
]);

export function getPredictionConsumer(domain) {
  return PREDICTION_CONSUMER_MATRIX.find((c) => c.domain === domain) || null;
}

export function validatePredictionConsumerMatrix() {
  const issues = [];
  if (PREDICTION_CONSUMER_MATRIX.length < 6) issues.push('consumer matrix incomplete');
  const domains = new Set();
  for (const c of PREDICTION_CONSUMER_MATRIX) {
    if (domains.has(c.domain)) issues.push(`duplicate ${c.domain}`);
    domains.add(c.domain);
    if (!c.dependencies?.length) issues.push(`${c.id} missing dependencies`);
    if (!c.requirements?.length) issues.push(`${c.id} missing requirements`);
  }
  for (const d of ['finance', 'maintenance', 'production', 'logistics', 'quality', 'environment']) {
    if (!domains.has(d)) issues.push(`missing consumer ${d}`);
  }
  const finance = getPredictionConsumer('finance');
  if (finance?.blockedBy?.includes('GAP-PB-005')) {
    issues.push('finance must not be blocked by closed GAP-PB-005');
  }
  return {
    valid: issues.length === 0,
    issues,
    count: PREDICTION_CONSUMER_MATRIX.length,
    phase: PRED_BASE_001_PHASE
  };
}
