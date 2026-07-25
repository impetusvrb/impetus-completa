/**
 * FIN-PRED-READY-001 — Read-only predictive readiness audit API.
 */
import {
  FIN_PRED_READY_001_PHASE,
  FIN_PRED_READY_001_PRINCIPLE,
  FIN_PRED_READY_001_SCOPE,
  FORBIDDEN_IN_PRED_READY_001,
  PREDICTION_SEMANTIC_LANES
} from '../predReadyConstants.js';
import {
  PREDICTABLE_CAPABILITY_INVENTORY,
  validateFinancePredictionInventory
} from '../inventory/financePredictionInventory.js';
import {
  FINANCE_HISTORY_ASSESSMENT,
  validateFinanceHistoryAssessment
} from '../history/financeHistoryAssessment.js';
import {
  FORECAST_TARGET_MATRIX,
  validateForecastTargetMatrix
} from '../forecast-targets/forecastTargetMatrix.js';
import {
  PREDICTION_CONFIDENCE_CONTRACT,
  PREDICTION_EXPLAINABILITY_REQUIREMENTS,
  validatePredictionConfidenceContract
} from '../confidence/predictionConfidenceContract.js';
import { getPredictionGovernanceApi, validatePredictionGovernance } from '../governance/predictionGovernanceApi.js';
import {
  FINANCE_PRED_READY_CONTRACTS,
  PREDICTION_LANE_CONTRACT,
  validatePredReadyContracts
} from '../contracts/predReadyContracts.js';
import {
  PRED_READY_GAPS,
  assessFinancePredictionReadiness,
  validatePredReadyGaps
} from '../gaps/predReadyGaps.js';

export function getFinancePredictionReadyAudit() {
  const assessment = assessFinancePredictionReadiness();
  return Object.freeze({
    phase: FIN_PRED_READY_001_PHASE,
    principle: FIN_PRED_READY_001_PRINCIPLE,
    scope: FIN_PRED_READY_001_SCOPE,
    forbidden: FORBIDDEN_IN_PRED_READY_001,
    semanticLanes: PREDICTION_SEMANTIC_LANES,
    inventory: PREDICTABLE_CAPABILITY_INVENTORY,
    history: FINANCE_HISTORY_ASSESSMENT,
    forecastTargets: FORECAST_TARGET_MATRIX,
    confidenceContract: PREDICTION_CONFIDENCE_CONTRACT,
    explainabilityRequirements: PREDICTION_EXPLAINABILITY_REQUIREMENTS,
    laneContract: PREDICTION_LANE_CONTRACT,
    contracts: FINANCE_PRED_READY_CONTRACTS,
    governance: getPredictionGovernanceApi(),
    gaps: PRED_READY_GAPS,
    assessment,
    next: Object.freeze({
      ifPartial: 'Close blocked history/forecasting gaps (or scope MVP excluding them) before FIN-EVOLVE-2.4',
      ifReady: 'FIN-EVOLVE-2.4 — Predictive composition as consumer of Engine / Twin / What-if',
      stillClosed: Object.freeze([
        'prediction_product',
        'machine_learning',
        'generative_ai',
        'auto_optimization',
        'autonomous_execution'
      ])
    })
  });
}

export function validateFinPredReady001() {
  const parts = [
    validateFinancePredictionInventory(),
    validateFinanceHistoryAssessment(),
    validateForecastTargetMatrix(),
    validatePredictionConfidenceContract(),
    validatePredictionGovernance(),
    validatePredReadyContracts(),
    validatePredReadyGaps()
  ];
  const issues = parts.flatMap((p) => p.issues || []);
  return {
    valid: parts.every((p) => p.valid) && issues.length === 0,
    issues,
    parts,
    audit: getFinancePredictionReadyAudit()
  };
}

export {
  assessFinancePredictionReadiness,
  PREDICTABLE_CAPABILITY_INVENTORY,
  FINANCE_HISTORY_ASSESSMENT,
  FORECAST_TARGET_MATRIX,
  PREDICTION_CONFIDENCE_CONTRACT,
  PRED_READY_GAPS
};
