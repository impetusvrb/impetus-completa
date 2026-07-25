/**
 * FIN-PRED-READY-001 — Confidence model contract (specification only — no algorithm).
 *
 * Prediction → Confidence → Evidence → Explanation
 */
import {
  FIN_PRED_READY_001_PHASE,
  FIN_PRED_READY_001_PRINCIPLE,
  PREDICTION_SEMANTIC_LANES
} from '../predReadyConstants.js';

export const PREDICTION_CONFIDENCE_CONTRACT = Object.freeze({
  id: 'finance.prediction_confidence.v0',
  version: '0.1.0',
  phase: FIN_PRED_READY_001_PHASE,
  principle: FIN_PRED_READY_001_PRINCIPLE,
  computesConfidence: false,
  algorithm: null,
  chain: Object.freeze(['prediction', 'confidence', 'evidence', 'explanation']),
  fields: Object.freeze([
    Object.freeze({
      name: 'prediction_id',
      type: 'string',
      required: true,
      note: 'Stable id for a forecast instance (future 2.4)'
    }),
    Object.freeze({
      name: 'target_indicator',
      type: 'string',
      required: true,
      note: 'Must map to FORECAST_TARGET_MATRIX.indicator'
    }),
    Object.freeze({
      name: 'horizon',
      type: 'string',
      required: true,
      note: 'e.g. 7d | 14d | 30d'
    }),
    Object.freeze({
      name: 'point_estimate',
      type: 'number',
      required: true,
      note: 'Central forecast value — never presented as observed_fact'
    }),
    Object.freeze({
      name: 'confidence_score',
      type: 'number',
      required: true,
      note: '0–1 ordinal confidence; method declared in confidence_method'
    }),
    Object.freeze({
      name: 'confidence_method',
      type: 'string',
      required: true,
      note: 'Declared method id — no silent scoring'
    }),
    Object.freeze({
      name: 'confidence_band_low',
      type: 'number',
      required: true,
      note: 'Lower uncertainty bound'
    }),
    Object.freeze({
      name: 'confidence_band_high',
      type: 'number',
      required: true,
      note: 'Upper uncertainty bound'
    }),
    Object.freeze({
      name: 'semantic_lane',
      type: 'enum',
      required: true,
      allowed: Object.freeze([PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION]),
      note: 'Must be forecast_prediction — never observed_fact or simulated_scenario'
    }),
    Object.freeze({
      name: 'evidence_refs',
      type: 'string[]',
      required: true,
      note: 'History sources / contracts consumed'
    }),
    Object.freeze({
      name: 'explanation',
      type: 'object',
      required: true,
      note: 'Must satisfy PREDICTION_EXPLAINABILITY_REQUIREMENTS'
    }),
    Object.freeze({
      name: 'limitations',
      type: 'string[]',
      required: true
    })
  ]),
  uncertaintyRepresentation: Object.freeze({
    required: true,
    forms: Object.freeze(['confidence_score', 'confidence_band_low', 'confidence_band_high']),
    forbidSilentPointEstimate: true
  })
});

export const PREDICTION_EXPLAINABILITY_REQUIREMENTS = Object.freeze([
  Object.freeze({ id: 'exp-origin', label: 'origem', required: true }),
  Object.freeze({ id: 'exp-hypothesis', label: 'hipótese', required: true }),
  Object.freeze({ id: 'exp-history', label: 'histórico utilizado', required: true }),
  Object.freeze({ id: 'exp-confidence', label: 'confiança', required: true }),
  Object.freeze({ id: 'exp-limitations', label: 'limitações', required: true }),
  Object.freeze({ id: 'exp-evidence', label: 'evidências', required: true })
]);

export function validatePredictionConfidenceContract() {
  const issues = [];
  const c = PREDICTION_CONFIDENCE_CONTRACT;
  if (c.computesConfidence) issues.push('contract must not compute confidence');
  if (c.algorithm != null) issues.push('contract must not embed algorithm');
  if (c.chain.length < 4) issues.push('confidence chain incomplete');
  if (c.fields.length < 10) issues.push('confidence fields incomplete');
  if (PREDICTION_EXPLAINABILITY_REQUIREMENTS.length < 6) {
    issues.push('explainability requirements incomplete');
  }
  if (!c.uncertaintyRepresentation?.forbidSilentPointEstimate) {
    issues.push('must forbid silent point estimates');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: FIN_PRED_READY_001_PHASE
  };
}
