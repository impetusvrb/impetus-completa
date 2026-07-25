/**
 * FIN-PRED-READY-001 — Semantic / explainability contracts for future prediction composition.
 */
import {
  FIN_PRED_READY_001_PHASE,
  PREDICTION_SEMANTIC_LANES
} from '../predReadyConstants.js';
import {
  PREDICTION_CONFIDENCE_CONTRACT,
  PREDICTION_EXPLAINABILITY_REQUIREMENTS
} from '../confidence/predictionConfidenceContract.js';

export const PREDICTION_LANE_CONTRACT = Object.freeze({
  id: 'finance.prediction_semantic_lanes.v0',
  phase: FIN_PRED_READY_001_PHASE,
  lanes: Object.freeze([
    Object.freeze({
      id: PREDICTION_SEMANTIC_LANES.OBSERVED_FACT,
      label: 'Fato observado',
      sources: Object.freeze(['dashboard.costs', 'dashboard.financialLeakage', 'WMS', 'MES']),
      mayTrainAsGroundTruth: true
    }),
    Object.freeze({
      id: PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO,
      label: 'Cenário simulado',
      sources: Object.freeze(['FIN-EVOLVE-2.3 What-if']),
      mayTrainAsGroundTruth: false
    }),
    Object.freeze({
      id: PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION,
      label: 'Previsão',
      sources: Object.freeze(['future FIN-EVOLVE-2.4 consumer']),
      mayTrainAsGroundTruth: false
    })
  ]),
  rule: 'Never present forecast_prediction or simulated_scenario as observed_fact in Finance UI'
});

export const FINANCE_PRED_READY_CONTRACTS = Object.freeze([
  PREDICTION_CONFIDENCE_CONTRACT,
  PREDICTION_LANE_CONTRACT,
  Object.freeze({
    id: 'finance.prediction_explainability.v0',
    phase: FIN_PRED_READY_001_PHASE,
    requirements: PREDICTION_EXPLAINABILITY_REQUIREMENTS,
    invalidWithout: Object.freeze([
      'origem',
      'hipótese',
      'histórico utilizado',
      'confiança',
      'limitações',
      'evidências'
    ])
  })
]);

export function validatePredReadyContracts() {
  const issues = [];
  if (FINANCE_PRED_READY_CONTRACTS.length < 3) issues.push('contracts incomplete');
  if (PREDICTION_LANE_CONTRACT.lanes.length !== 3) issues.push('semantic lanes incomplete');
  const sim = PREDICTION_LANE_CONTRACT.lanes.find(
    (l) => l.id === PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO
  );
  if (sim?.mayTrainAsGroundTruth) issues.push('what-if must not train as ground truth');
  return { valid: issues.length === 0, issues, phase: FIN_PRED_READY_001_PHASE };
}
