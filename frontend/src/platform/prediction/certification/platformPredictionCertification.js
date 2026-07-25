/**
 * PRED-BASE-002 — Formal certification of enterprise prediction platform.
 * Closes GAP-PB-005. Energy (GAP-PB-003) remains coverage expansion — not absolute blocker.
 */
import {
  PRED_BASE_002_PHASE,
  PRED_BASE_002_PRINCIPLE,
  PRED_BASE_002_SCOPE,
  CERT_STATUS
} from './predBase002Constants.js';
import { ENTERPRISE_PREDICTION_CONTRACT } from '../contracts/enterprisePredictionContracts.js';
import { PLATFORM_SEMANTIC_LANES_CERTIFICATION } from '../contracts/platformSemanticLanes.js';
import { validatePlatformPredictionPublicApi } from '../public-api/platformPredictionPublicApi.js';
import {
  listCertifiedCapabilities,
  validateCertifiedPredictionRegistry
} from '../registry/certifiedPredictionRegistry.js';
import {
  getCoverageBySource,
  validatePredictionCoverageMatrix
} from '../coverage/predictionCoverageMatrix.js';
import { validateCertifiedConsumerReadiness } from '../consumers/certifiedConsumerReadiness.js';
import { PRED_BASE_STATUS } from '../predBaseConstants.js';

export const PLATFORM_PREDICTION_CERTIFICATION = Object.freeze({
  id: 'CERT-PLATFORM-PREDICTION-v1',
  phase: PRED_BASE_002_PHASE,
  principle: PRED_BASE_002_PRINCIPLE,
  contractId: ENTERPRISE_PREDICTION_CONTRACT.id,
  contractVersion: ENTERPRISE_PREDICTION_CONTRACT.version,
  certifiedAt: '2026-07-20',
  status: CERT_STATUS.CERTIFIED,
  auditedComponents: Object.freeze([
    Object.freeze({
      id: 'operational_forecasting_service',
      stability: 'READY',
      compatibility: 'dashboard.forecasting.* mounts',
      observability: 'dashboard health + impetus:finance consumers later',
      integration: 'Centro Previsão + Command Center widget',
      verdict: CERT_STATUS.CERTIFIED
    }),
    Object.freeze({
      id: 'dashboard_chart_series',
      stability: 'READY',
      compatibility: 'ImpetusChart',
      observability: 'dashboard routes',
      integration: 'Command Center trend widgets',
      verdict: CERT_STATUS.CERTIFIED
    }),
    Object.freeze({
      id: 'digital_twin_signals',
      stability: 'READY',
      compatibility: 'integrations twin state',
      observability: 'twin events',
      integration: 'Finance twin overlay / ManuIA',
      verdict: CERT_STATUS.CERTIFIED
    }),
    Object.freeze({
      id: 'semantic_lanes',
      stability: 'READY',
      compatibility: PLATFORM_SEMANTIC_LANES_CERTIFICATION.id,
      observability: 'required on normalized outputs',
      integration: 'public API normalizer',
      verdict: CERT_STATUS.CERTIFIED
    })
  ]),
  gapsClosed: Object.freeze(['GAP-PB-005']),
  gapsDeferredAsCoverage: Object.freeze(['GAP-PB-003']),
  temporaryExclusions: Object.freeze([
    Object.freeze({
      id: 'energia',
      reason: 'Historical energy series not certified — coverage expansion only',
      gap: 'GAP-PB-003'
    })
  ])
});

/**
 * Certification verdict + gates for domain products.
 */
export function assessPlatformPredictionCertification() {
  const registry = validateCertifiedPredictionRegistry();
  const coverage = validatePredictionCoverageMatrix();
  const api = validatePlatformPredictionPublicApi();
  const consumers = validateCertifiedConsumerReadiness();
  const energy = getCoverageBySource('energia');

  const checksOk = registry.valid && coverage.valid && api.valid && consumers.valid;
  const gapPb005Closed = PLATFORM_PREDICTION_CERTIFICATION.gapsClosed.includes('GAP-PB-005');
  const platformCertified =
    checksOk &&
    gapPb005Closed &&
    PLATFORM_PREDICTION_CERTIFICATION.status === CERT_STATUS.CERTIFIED &&
    listCertifiedCapabilities().length >= 4;

  return Object.freeze({
    phase: PRED_BASE_002_PHASE,
    principle: PRED_BASE_002_PRINCIPLE,
    scope: PRED_BASE_002_SCOPE,
    certification: PLATFORM_PREDICTION_CERTIFICATION,
    platformCertified,
    contractOfficiallyCertified: platformCertified,
    gapPb005Closed,
    gapPb003Status: PRED_BASE_STATUS.PARTIAL,
    gapPb003BlocksPlatform: false,
    energyCoverage: energy?.status || PRED_BASE_STATUS.PARTIAL,
    certifiedCapabilityCount: listCertifiedCapabilities().length,
    gate: Object.freeze({
      openEnterprisePredictionConsumers: platformCertified,
      openFinEvolve24: platformCertified,
      openFinEvolve24AsPlatformConsumer: platformCertified,
      openEnergyForecasts: false,
      reason: platformCertified
        ? 'GAP-PB-005 closed — domains may consume certified mounts under platform.prediction.v0; energy remains coverage expansion (GAP-PB-003)'
        : 'Certification incomplete'
    }),
    criteriaForFinEvolve24: Object.freeze([
      'Consume only certified capabilities via public API',
      'Exclude energy targets until GAP-PB-003 coverage expansion',
      'Compose over Engine 2.1 / Twin 2.2 / What-if 2.3 — no parallel prediction engine',
      'PREDICT WITHOUT DECIDING',
      'Label semantic_lane=forecast_prediction on all outputs'
    ]),
    validations: Object.freeze({ registry, coverage, api, consumers })
  });
}

export function validatePlatformPredictionCertification() {
  const issues = [];
  const a = assessPlatformPredictionCertification();
  if (!a.platformCertified) issues.push('platform not certified');
  if (!a.gapPb005Closed) issues.push('GAP-PB-005 must be closed');
  if (a.gapPb003BlocksPlatform) issues.push('GAP-PB-003 must not block platform');
  if (!a.gate.openFinEvolve24) issues.push('FIN-EVOLVE-2.4 gate must open after certification');
  if (a.gate.openEnergyForecasts) issues.push('energy forecasts must stay closed');
  if (PRED_BASE_002_SCOPE.createsNewForecastingMotors) {
    issues.push('must not create new motors');
  }
  return { valid: issues.length === 0, issues, assessment: a };
}
