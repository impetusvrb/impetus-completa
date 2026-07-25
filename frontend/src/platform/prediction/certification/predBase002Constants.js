/**
 * PRED-BASE-002 — Enterprise Prediction Platform Certification
 * Principle: CERTIFY BEFORE CONSUME
 * Certifies existing forecasting under platform.prediction.v0 — no new engines.
 */
export const PRED_BASE_002_PHASE = 'PRED-BASE-002';
export const PRED_BASE_002_PRINCIPLE = 'CERTIFY BEFORE CONSUME';

export const PRED_BASE_002_SCOPE = Object.freeze({
  rewritesForecastingEngines: false,
  createsNewForecastingMotors: false,
  implementsDomainPredictions: false,
  implementsStatisticalModels: false,
  implementsGenerativeAi: false,
  altersTwin: false,
  altersEconomicEngine: false,
  altersWhatIf: false,
  certifiesExistingOnly: true,
  readOnlyAdapters: true
});

export const FORBIDDEN_IN_PRED_BASE_002 = Object.freeze([
  'finance_prediction_product',
  'statistical_model',
  'generative_ai',
  'new_forecasting_engine',
  'alter_twin',
  'alter_economic_intelligence_engine',
  'alter_whatif'
]);

/** Certification status values */
export const CERT_STATUS = Object.freeze({
  CERTIFIED: 'CERTIFIED',
  PARTIAL: 'PARTIAL',
  EXCLUDED: 'EXCLUDED',
  PENDING: 'PENDING'
});
