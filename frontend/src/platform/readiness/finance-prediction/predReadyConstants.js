/**
 * FIN-PRED-READY-001 — Predictive Readiness & Governance
 * Principle: PREDICT WITHOUT DECIDING
 * Read-only certification — no models, ML, AI, or prediction engines.
 */
export const FIN_PRED_READY_001_PHASE = 'FIN-PRED-READY-001';
export const FIN_PRED_READY_001_PRINCIPLE = 'PREDICT WITHOUT DECIDING';

export const PRED_READY_STATUS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  NOT_READY: 'NOT_READY',
  BLOCKED: 'BLOCKED'
});

export const FIN_PRED_READY_001_SCOPE = Object.freeze({
  implementsPrediction: false,
  implementsMachineLearning: false,
  implementsGenerativeAi: false,
  implementsOptimization: false,
  altersEconomicEngine: false,
  altersFinancialTwin: false,
  altersWhatIf: false,
  readOnly: true
});

export const FORBIDDEN_IN_PRED_READY_001 = Object.freeze([
  'prediction_engine',
  'statistical_model',
  'machine_learning',
  'generative_ai',
  'auto_optimization',
  'autonomous_execution',
  'continuous_learning_ungoverned'
]);

/** Semantic lanes — must never be conflated in Finance UI/API */
export const PREDICTION_SEMANTIC_LANES = Object.freeze({
  OBSERVED_FACT: 'observed_fact',
  SIMULATED_SCENARIO: 'simulated_scenario',
  FORECAST_PREDICTION: 'forecast_prediction'
});
