/**
 * PRED-BASE-001 — Read-only platform prediction baseline API.
 */
import {
  PRED_BASE_001_PHASE,
  PRED_BASE_001_PRINCIPLE,
  PRED_BASE_001_SCOPE,
  FORBIDDEN_IN_PRED_BASE_001,
  PLATFORM_PREDICTION_SEMANTIC_LANES
} from '../predBaseConstants.js';
import {
  PLATFORM_FORECASTING_INVENTORY,
  validatePlatformForecastingInventory
} from '../inventory/platformForecastingInventory.js';
import {
  PLATFORM_HISTORY_ASSESSMENT,
  validatePlatformHistoryAssessment
} from '../history/platformHistoryAssessment.js';
import {
  ENTERPRISE_PREDICTION_CONTRACT,
  PLATFORM_PREDICTION_CONTRACTS,
  validateEnterprisePredictionContracts
} from '../contracts/enterprisePredictionContracts.js';
import {
  PLATFORM_SEMANTIC_LANES_CERTIFICATION,
  validatePlatformSemanticLanes
} from '../contracts/platformSemanticLanes.js';
import {
  PLATFORM_PREDICTION_GOVERNANCE,
  validatePlatformPredictionGovernance
} from '../governance/platformPredictionGovernance.js';
import {
  PREDICTION_CONSUMER_MATRIX,
  validatePredictionConsumerMatrix
} from '../consumers/predictionConsumerMatrix.js';
import {
  PRED_BASE_GAPS,
  assessPlatformPredictionReadiness,
  validatePredBaseGaps
} from '../readiness/platformPredictionReadiness.js';

export function getPlatformPredictionBaselineAudit() {
  const assessment = assessPlatformPredictionReadiness();
  return Object.freeze({
    phase: PRED_BASE_001_PHASE,
    principle: PRED_BASE_001_PRINCIPLE,
    scope: PRED_BASE_001_SCOPE,
    forbidden: FORBIDDEN_IN_PRED_BASE_001,
    semanticLanes: PLATFORM_PREDICTION_SEMANTIC_LANES,
    inventory: PLATFORM_FORECASTING_INVENTORY,
    history: PLATFORM_HISTORY_ASSESSMENT,
    contracts: PLATFORM_PREDICTION_CONTRACTS,
    enterpriseContract: ENTERPRISE_PREDICTION_CONTRACT,
    lanesCertification: PLATFORM_SEMANTIC_LANES_CERTIFICATION,
    governance: PLATFORM_PREDICTION_GOVERNANCE,
    consumers: PREDICTION_CONSUMER_MATRIX,
    gaps: PRED_BASE_GAPS,
    assessment,
    next: Object.freeze({
      resolveFirst: Object.freeze(['PRED-BASE-002 certification gate', 'GAP-PB-003 coverage expansion (optional)']),
      thenOpen: 'FIN-EVOLVE-2.4 — Predictive composition as consumer of certified platform (not a fork)',
      stillClosed: Object.freeze([
        'fin_evolve_2_4_until_pred_base_002_gate',
        'domain_prediction_products_until_cert',
        'ml_training',
        'finance_only_predictive_mvp'
      ])
    })
  });
}

export function validatePredBase001() {
  const parts = [
    validatePlatformForecastingInventory(),
    validatePlatformHistoryAssessment(),
    validateEnterprisePredictionContracts(),
    validatePlatformSemanticLanes(),
    validatePlatformPredictionGovernance(),
    validatePredictionConsumerMatrix(),
    validatePredBaseGaps()
  ];
  const issues = parts.flatMap((p) => p.issues || []);
  return {
    valid: parts.every((p) => p.valid) && issues.length === 0,
    issues,
    parts,
    audit: getPlatformPredictionBaselineAudit()
  };
}

export {
  assessPlatformPredictionReadiness,
  PLATFORM_FORECASTING_INVENTORY,
  PLATFORM_HISTORY_ASSESSMENT,
  ENTERPRISE_PREDICTION_CONTRACT,
  PREDICTION_CONSUMER_MATRIX,
  PRED_BASE_GAPS
};
