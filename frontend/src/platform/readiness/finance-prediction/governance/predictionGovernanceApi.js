/**
 * FIN-PRED-READY-001 — Governance query API (read-only).
 */
import {
  PREDICTION_GOVERNANCE,
  listPredictionGovernanceRules,
  validatePredictionGovernance
} from './predictionGovernance.js';
import { FIN_PRED_READY_001_PHASE, FIN_PRED_READY_001_PRINCIPLE } from '../predReadyConstants.js';

export function getPredictionGovernanceApi() {
  return Object.freeze({
    phase: FIN_PRED_READY_001_PHASE,
    principle: FIN_PRED_READY_001_PRINCIPLE,
    contract: PREDICTION_GOVERNANCE,
    rules: listPredictionGovernanceRules(),
    forbiddenActions: PREDICTION_GOVERNANCE.forbiddenActions,
    validation: validatePredictionGovernance()
  });
}

export { PREDICTION_GOVERNANCE, listPredictionGovernanceRules, validatePredictionGovernance };
