/**
 * PRED-BASE-001 — Platform prediction governance (rules only).
 */
import { PRED_BASE_001_PHASE, PRED_BASE_001_PRINCIPLE } from '../predBaseConstants.js';

export const PLATFORM_PREDICTION_GOVERNANCE = Object.freeze({
  id: 'platform.prediction_governance.v0',
  phase: PRED_BASE_001_PHASE,
  principle: PRED_BASE_001_PRINCIPLE,
  implementsEngine: false,
  rules: Object.freeze([
    Object.freeze({
      id: 'GOV-PB-001',
      topic: 'horizontal_first',
      rule: 'Prediction capabilities are implemented once on the platform and reused by domains'
    }),
    Object.freeze({
      id: 'GOV-PB-002',
      topic: 'no_domain_fork',
      rule: 'Forbid domain-specific prediction engines when an equivalent corporate capability exists'
    }),
    Object.freeze({
      id: 'GOV-PB-003',
      topic: 'predict_without_deciding',
      rule: 'Platform predictions must not auto-decide, auto-execute, or mutate operational state'
    }),
    Object.freeze({
      id: 'GOV-PB-004',
      topic: 'semantic_lanes',
      rule: 'Consumers must label observed_fact | simulated_scenario | forecast_prediction'
    }),
    Object.freeze({
      id: 'GOV-PB-005',
      topic: 'contract_compliance',
      rule: 'Domain consumers must use platform.prediction.v0 (or certified extension), not ad-hoc payloads'
    }),
    Object.freeze({
      id: 'GOV-PB-006',
      topic: 'certify_before_consume',
      rule: 'Domains (incl. FIN-EVOLVE-2.4) stay closed until PRED-BASE blockers are resolved or explicitly scoped'
    })
  ]),
  forbidden: Object.freeze([
    'domain_prediction_fork',
    'finance_only_ml_engine',
    'train_on_simulated_as_fact',
    'ungoverned_continuous_learning',
    'auto_execution'
  ])
});

export function validatePlatformPredictionGovernance() {
  const issues = [];
  if (PLATFORM_PREDICTION_GOVERNANCE.implementsEngine) {
    issues.push('governance must not implement engine');
  }
  if (PLATFORM_PREDICTION_GOVERNANCE.rules.length < 6) issues.push('governance incomplete');
  if (!PLATFORM_PREDICTION_GOVERNANCE.forbidden.includes('domain_prediction_fork')) {
    issues.push('must forbid domain forks');
  }
  return { valid: issues.length === 0, issues, phase: PRED_BASE_001_PHASE };
}
