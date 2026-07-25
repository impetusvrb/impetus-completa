/**
 * PRED-BASE-002 — Formal certification report (query API).
 */
import {
  PRED_BASE_002_PHASE,
  PRED_BASE_002_PRINCIPLE,
  PRED_BASE_002_SCOPE,
  FORBIDDEN_IN_PRED_BASE_002
} from '../certification/predBase002Constants.js';
import {
  PLATFORM_PREDICTION_CERTIFICATION,
  assessPlatformPredictionCertification,
  validatePlatformPredictionCertification
} from '../certification/platformPredictionCertification.js';
import { listCertifiedCapabilities } from '../registry/certifiedPredictionRegistry.js';
import { PREDICTION_COVERAGE_MATRIX } from '../coverage/predictionCoverageMatrix.js';
import { CERTIFIED_CONSUMER_READINESS } from '../consumers/certifiedConsumerReadiness.js';
import { PLATFORM_PREDICTION_PUBLIC_API } from '../public-api/platformPredictionPublicApi.js';
import { validatePlatformForecastingInventory } from '../inventory/platformForecastingInventory.js';
import { validatePlatformHistoryAssessment } from '../history/platformHistoryAssessment.js';
import { validateEnterprisePredictionContracts } from '../contracts/enterprisePredictionContracts.js';
import { validatePlatformSemanticLanes } from '../contracts/platformSemanticLanes.js';
import { validatePlatformPredictionGovernance } from '../governance/platformPredictionGovernance.js';
import { validatePredictionConsumerMatrix } from '../consumers/predictionConsumerMatrix.js';

export function getPlatformPredictionCertificationReport() {
  const assessment = assessPlatformPredictionCertification();
  return Object.freeze({
    phase: PRED_BASE_002_PHASE,
    principle: PRED_BASE_002_PRINCIPLE,
    scope: PRED_BASE_002_SCOPE,
    forbidden: FORBIDDEN_IN_PRED_BASE_002,
    certification: PLATFORM_PREDICTION_CERTIFICATION,
    assessment,
    certifiedCapabilities: listCertifiedCapabilities(),
    coverage: PREDICTION_COVERAGE_MATRIX,
    consumers: CERTIFIED_CONSUMER_READINESS,
    publicApi: PLATFORM_PREDICTION_PUBLIC_API,
    temporaryExclusions: PLATFORM_PREDICTION_CERTIFICATION.temporaryExclusions,
    criteriaForFinEvolve24: assessment.criteriaForFinEvolve24,
    next: Object.freeze({
      openNow: assessment.gate.openFinEvolve24 ? 'FIN-EVOLVE-2.4 as platform consumer' : 'HOLD',
      laterCoverage: 'GAP-PB-003 energy history expansion',
      stillForbidden: Object.freeze([
        'finance_only_prediction_fork',
        'energy_forecasts_until_pb003',
        'auto_decision_from_prediction'
      ])
    })
  });
}

export function validatePredBase002() {
  const parts = [
    validatePlatformForecastingInventory(),
    validatePlatformHistoryAssessment(),
    validateEnterprisePredictionContracts(),
    validatePlatformSemanticLanes(),
    validatePlatformPredictionGovernance(),
    validatePredictionConsumerMatrix(),
    validatePlatformPredictionCertification()
  ];
  const issues = parts.flatMap((p) => p.issues || []);
  return {
    valid: parts.every((p) => p.valid) && issues.length === 0,
    issues,
    parts,
    report: getPlatformPredictionCertificationReport()
  };
}
