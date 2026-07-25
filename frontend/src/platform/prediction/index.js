/**
 * PRED-BASE-001 — Enterprise Prediction Platform Baseline (READ ONLY).
 * Principle: PREDICTION IS A PLATFORM CAPABILITY
 */
export {
  PRED_BASE_001_PHASE,
  PRED_BASE_001_PRINCIPLE,
  PRED_BASE_001_SCOPE,
  PRED_BASE_STATUS,
  FORBIDDEN_IN_PRED_BASE_001,
  PLATFORM_PREDICTION_SEMANTIC_LANES
} from './predBaseConstants.js';

export {
  PLATFORM_FORECASTING_INVENTORY,
  getForecastingCapability,
  listForecastingByStatus,
  listForecastingByCategory,
  validatePlatformForecastingInventory
} from './inventory/platformForecastingInventory.js';

export {
  PLATFORM_HISTORY_ASSESSMENT,
  getPlatformHistory,
  validatePlatformHistoryAssessment
} from './history/platformHistoryAssessment.js';

export {
  ENTERPRISE_PREDICTION_CONTRACT,
  PLATFORM_PREDICTION_CONTRACTS,
  validateEnterprisePredictionContracts
} from './contracts/enterprisePredictionContracts.js';

export {
  PLATFORM_SEMANTIC_LANES_CERTIFICATION,
  validatePlatformSemanticLanes
} from './contracts/platformSemanticLanes.js';

export {
  PLATFORM_PREDICTION_GOVERNANCE,
  validatePlatformPredictionGovernance
} from './governance/platformPredictionGovernance.js';

export {
  PREDICTION_CONSUMER_MATRIX,
  getPredictionConsumer,
  validatePredictionConsumerMatrix
} from './consumers/predictionConsumerMatrix.js';

export {
  PRED_BASE_GAPS,
  assessPlatformPredictionReadiness,
  validatePredBaseGaps
} from './readiness/platformPredictionReadiness.js';

export {
  getPlatformPredictionBaselineAudit,
  validatePredBase001
} from './api/platformPredictionBaselineApi.js';

/** PRED-BASE-002 — Certification */
export {
  PRED_BASE_002_PHASE,
  PRED_BASE_002_PRINCIPLE,
  PRED_BASE_002_SCOPE,
  CERT_STATUS,
  FORBIDDEN_IN_PRED_BASE_002
} from './certification/predBase002Constants.js';

export {
  PLATFORM_PREDICTION_CERTIFICATION,
  assessPlatformPredictionCertification,
  validatePlatformPredictionCertification
} from './certification/platformPredictionCertification.js';

export {
  CERTIFIED_PREDICTION_REGISTRY,
  getRegisteredCapability,
  listCertifiedCapabilities,
  listCapabilitiesForConsumer,
  validateCertifiedPredictionRegistry
} from './registry/certifiedPredictionRegistry.js';

export {
  PLATFORM_PREDICTION_PUBLIC_API,
  PLATFORM_PREDICTION_PUBLIC_MOUNTS,
  discoverPlatformPredictionCapabilities,
  normalizeForecastToPlatformContract,
  getPlatformPredictionConfidence,
  getPlatformPredictionLimitations,
  validatePlatformPredictionPublicApi
} from './public-api/platformPredictionPublicApi.js';

export {
  PREDICTION_COVERAGE_MATRIX,
  getCoverageBySource,
  listInitialWaveCoverage,
  validatePredictionCoverageMatrix
} from './coverage/predictionCoverageMatrix.js';

export {
  CERTIFIED_CONSUMER_READINESS,
  getCertifiedConsumerReadiness,
  validateCertifiedConsumerReadiness
} from './consumers/certifiedConsumerReadiness.js';

export {
  getPlatformPredictionCertificationReport,
  validatePredBase002
} from './reports/platformPredictionCertificationReport.js';
