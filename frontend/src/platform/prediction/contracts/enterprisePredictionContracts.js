/**
 * PRED-BASE-001 — Corporate prediction contracts (specification only).
 */
import {
  PRED_BASE_001_PHASE,
  PRED_BASE_001_PRINCIPLE,
  PLATFORM_PREDICTION_SEMANTIC_LANES
} from '../predBaseConstants.js';

export const ENTERPRISE_PREDICTION_CONTRACT = Object.freeze({
  id: 'platform.prediction.v0',
  version: '0.1.0',
  phase: PRED_BASE_001_PHASE,
  principle: PRED_BASE_001_PRINCIPLE,
  implementsModel: false,
  algorithm: null,
  input: Object.freeze([
    Object.freeze({ name: 'domain_id', type: 'string', required: true }),
    Object.freeze({ name: 'target_indicator', type: 'string', required: true }),
    Object.freeze({ name: 'horizon', type: 'string', required: true }),
    Object.freeze({ name: 'history_refs', type: 'string[]', required: true }),
    Object.freeze({ name: 'company_id', type: 'string', required: true }),
    Object.freeze({ name: 'as_of', type: 'iso_datetime', required: true })
  ]),
  output: Object.freeze([
    Object.freeze({ name: 'prediction_id', type: 'string', required: true }),
    Object.freeze({ name: 'point_estimate', type: 'number', required: true }),
    Object.freeze({ name: 'confidence_score', type: 'number', required: true }),
    Object.freeze({ name: 'confidence_band_low', type: 'number', required: true }),
    Object.freeze({ name: 'confidence_band_high', type: 'number', required: true }),
    Object.freeze({ name: 'horizon', type: 'string', required: true }),
    Object.freeze({
      name: 'semantic_lane',
      type: 'enum',
      required: true,
      allowed: Object.freeze([PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION])
    }),
    Object.freeze({ name: 'evidence_refs', type: 'string[]', required: true }),
    Object.freeze({ name: 'limitations', type: 'string[]', required: true }),
    Object.freeze({ name: 'trace_id', type: 'string', required: true })
  ]),
  confidence: Object.freeze({
    required: true,
    forbidSilentPointEstimate: true,
    chain: Object.freeze(['prediction', 'confidence', 'evidence', 'explanation'])
  }),
  traceability: Object.freeze({
    required: true,
    mustLink: Object.freeze(['history_refs', 'contract_version', 'model_version_or_method_id'])
  }),
  reuseRule:
    'Domains must consume this contract — forbid parallel domain prediction engines when equivalent platform capability exists'
});

export const PLATFORM_PREDICTION_CONTRACTS = Object.freeze([
  ENTERPRISE_PREDICTION_CONTRACT,
  Object.freeze({
    id: 'platform.prediction_confidence.v0',
    phase: PRED_BASE_001_PHASE,
    alignsWith: 'finance.prediction_confidence.v0 (FIN-PRED-READY)',
    note: 'Corporate confidence shape; Finance contract remains domain specialization of this baseline'
  }),
  Object.freeze({
    id: 'platform.operational_forecasting.mount.v0',
    phase: PRED_BASE_001_PHASE,
    status: 'certified_as_enterprise_prediction',
    certifiedBy: 'PRED-BASE-002',
    path: 'dashboard.forecasting.*',
    note: 'Operational forecasting certified under platform.prediction.v0 — GAP-PB-005 CLOSED'
  })
]);

export function validateEnterprisePredictionContracts() {
  const issues = [];
  const c = ENTERPRISE_PREDICTION_CONTRACT;
  if (c.implementsModel) issues.push('contract must not implement model');
  if (c.algorithm != null) issues.push('contract must not embed algorithm');
  if (c.input.length < 5) issues.push('input incomplete');
  if (c.output.length < 8) issues.push('output incomplete');
  if (!c.confidence?.forbidSilentPointEstimate) issues.push('must forbid silent point estimate');
  if (PLATFORM_PREDICTION_CONTRACTS.length < 3) issues.push('contract catalog incomplete');
  return {
    valid: issues.length === 0,
    issues,
    phase: PRED_BASE_001_PHASE
  };
}
