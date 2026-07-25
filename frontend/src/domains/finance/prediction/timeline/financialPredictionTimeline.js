/**
 * FIN-EVOLVE-2.4 — Three-lane temporal perspective for Finance.
 * Observed, simulated and forecast values remain separate.
 */
import { FINANCIAL_PREDICTION_LANES } from '../prediction-adapter/financialPredictionConstants.js';

const LANE_LABELS = Object.freeze({
  [FINANCIAL_PREDICTION_LANES.OBSERVED]: 'Estado observado',
  [FINANCIAL_PREDICTION_LANES.SIMULATED]: 'Cenário simulado',
  [FINANCIAL_PREDICTION_LANES.FORECAST]: 'Previsão'
});

export function composeFinancialTemporalPerspective({
  observed = {},
  simulatedComparison = null,
  predictions = []
} = {}) {
  const observedItems = Object.entries(observed)
    .filter(([, value]) => value != null)
    .map(([target, value]) => Object.freeze({ target, value }));
  const simulatedItems = (simulatedComparison?.metrics || []).map((metric) =>
    Object.freeze({
      target: metric.id,
      current: metric.current,
      value: metric.simulated,
      delta: metric.delta,
      scenarioId: simulatedComparison.scenarioId || null
    })
  );
  const forecastItems = predictions.map((prediction) =>
    Object.freeze({
      target: prediction.target,
      current: prediction.current_value,
      value: prediction.predicted_value,
      delta: prediction.delta,
      horizon: prediction.horizon,
      confidence: prediction.confidence_score,
      predictionId: prediction.prediction_id
    })
  );

  return Object.freeze({
    kind: 'financial_temporal_perspective',
    lanes: Object.freeze([
      Object.freeze({
        id: FINANCIAL_PREDICTION_LANES.OBSERVED,
        label: LANE_LABELS[FINANCIAL_PREDICTION_LANES.OBSERVED],
        items: Object.freeze(observedItems)
      }),
      Object.freeze({
        id: FINANCIAL_PREDICTION_LANES.SIMULATED,
        label: LANE_LABELS[FINANCIAL_PREDICTION_LANES.SIMULATED],
        items: Object.freeze(simulatedItems)
      }),
      Object.freeze({
        id: FINANCIAL_PREDICTION_LANES.FORECAST,
        label: LANE_LABELS[FINANCIAL_PREDICTION_LANES.FORECAST],
        items: Object.freeze(forecastItems)
      })
    ]),
    mutatesTwin: false
  });
}

export function comparePredictionWithWhatIf(predictions = [], simulatedComparison = null) {
  const aliases = Object.freeze({
    operational_cost: 'total_cost',
    unit_cost: 'unit_cost',
    leakage: 'losses',
    valuation: 'valuation',
    economic_efficiency: 'efficiency'
  });
  const simulated = simulatedComparison?.metrics || [];

  return Object.freeze(
    predictions
      .map((prediction) => {
        const simulation = simulated.find(
          (metric) => metric.id === (aliases[prediction.target] || prediction.target)
        );
        if (!simulation || simulation.simulated == null || prediction.predicted_value == null) {
          return null;
        }
        return Object.freeze({
          target: prediction.target,
          label: prediction.label,
          predictionId: prediction.prediction_id,
          scenarioId: simulatedComparison?.scenarioId || null,
          forecastLane: FINANCIAL_PREDICTION_LANES.FORECAST,
          simulationLane: FINANCIAL_PREDICTION_LANES.SIMULATED,
          predicted: prediction.predicted_value,
          simulated: simulation.simulated,
          difference: Math.round((simulation.simulated - prediction.predicted_value) * 10000) / 10000,
          confidence: prediction.confidence_score,
          explanation: Object.freeze({
            predictionOrigin: prediction.origin,
            simulationOrigin: 'FIN-EVOLVE-2.3 What-if',
            conceptsMixed: false
          })
        });
      })
      .filter(Boolean)
  );
}

export function validateFinancialTemporalPerspective(perspective) {
  const issues = [];
  const ids = perspective?.lanes?.map((lane) => lane.id) || [];
  for (const required of Object.values(FINANCIAL_PREDICTION_LANES)) {
    if (!ids.includes(required)) issues.push(`missing lane ${required}`);
  }
  if (new Set(ids).size !== 3) issues.push('semantic lanes must be distinct');
  if (perspective?.mutatesTwin) issues.push('temporal perspective must not mutate Twin');
  return { valid: issues.length === 0, issues };
}

