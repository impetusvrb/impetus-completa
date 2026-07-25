/**
 * PRED-BASE-001 — Semantic lanes certification (platform).
 */
import {
  PRED_BASE_001_PHASE,
  PLATFORM_PREDICTION_SEMANTIC_LANES
} from '../predBaseConstants.js';

export const PLATFORM_SEMANTIC_LANES_CERTIFICATION = Object.freeze({
  id: 'platform.prediction_semantic_lanes.v0',
  phase: PRED_BASE_001_PHASE,
  certified: true,
  lanes: Object.freeze([
    Object.freeze({
      id: PLATFORM_PREDICTION_SEMANTIC_LANES.OBSERVED_FACT,
      label: 'Fato observado',
      mayTrainAsGroundTruth: true,
      examples: Object.freeze(['dashboard.costs', 'MES qty', 'WMS stock', 'leakage alerts realized'])
    }),
    Object.freeze({
      id: PLATFORM_PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO,
      label: 'Cenário simulado',
      mayTrainAsGroundTruth: false,
      examples: Object.freeze(['FIN-EVOLVE-2.3 What-if', 'Centro Previsão decision simulation UI'])
    }),
    Object.freeze({
      id: PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION,
      label: 'Previsão',
      mayTrainAsGroundTruth: false,
      examples: Object.freeze([
        'future enterprise prediction consumer outputs',
        'operationalForecasting projections when certified under platform.prediction.v0'
      ])
    })
  ]),
  consumerRule:
    'Every prediction-capable UI/API must expose semantic_lane explicitly — never conflate lanes',
  alignsWithFinance: 'FIN-PRED-READY PREDICTION_LANE_CONTRACT'
});

export function validatePlatformSemanticLanes() {
  const issues = [];
  const c = PLATFORM_SEMANTIC_LANES_CERTIFICATION;
  if (!c.certified) issues.push('lanes must be certified in PRED-BASE');
  if (c.lanes.length !== 3) issues.push('exactly 3 lanes required');
  const ids = c.lanes.map((l) => l.id);
  for (const required of Object.values(PLATFORM_PREDICTION_SEMANTIC_LANES)) {
    if (!ids.includes(required)) issues.push(`missing lane ${required}`);
  }
  const sim = c.lanes.find((l) => l.id === PLATFORM_PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO);
  if (sim?.mayTrainAsGroundTruth) issues.push('simulated must not train as ground truth');
  const pred = c.lanes.find((l) => l.id === PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION);
  if (pred?.mayTrainAsGroundTruth) issues.push('forecast must not train as ground truth');
  return { valid: issues.length === 0, issues, phase: PRED_BASE_001_PHASE };
}
