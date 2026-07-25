/**
 * PRED-BASE-001 — Enterprise Prediction Platform Baseline
 * Principle: PREDICTION IS A PLATFORM CAPABILITY
 * Read-only — no models, ML, training, or domain prediction products.
 */
export const PRED_BASE_001_PHASE = 'PRED-BASE-001';
export const PRED_BASE_001_PRINCIPLE = 'PREDICTION IS A PLATFORM CAPABILITY';

export const PRED_BASE_STATUS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  DISCOVERED: 'DISCOVERED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  BLOCKED: 'BLOCKED',
  NOT_READY: 'NOT_READY'
});

export const PRED_BASE_001_SCOPE = Object.freeze({
  implementsStatisticalModels: false,
  implementsMachineLearning: false,
  implementsGenerativeAi: false,
  trainsModels: false,
  altersEconomicEngine: false,
  altersFinancialTwin: false,
  altersWhatIf: false,
  implementsDomainPrediction: false,
  readOnly: true,
  platformLevel: true
});

export const FORBIDDEN_IN_PRED_BASE_001 = Object.freeze([
  'statistical_model_implementation',
  'machine_learning',
  'generative_ai',
  'model_training',
  'domain_specific_prediction_engine',
  'finance_only_forecast_fork',
  'alter_certified_finance_2_1_2_2_2_3'
]);

/** Corporate semantic lanes (lifted from FIN-PRED-READY, platform-certified here) */
export const PLATFORM_PREDICTION_SEMANTIC_LANES = Object.freeze({
  OBSERVED_FACT: 'observed_fact',
  SIMULATED_SCENARIO: 'simulated_scenario',
  FORECAST_PREDICTION: 'forecast_prediction'
});
