/**
 * FIN-EVOLVE-2.4 — Mandatory confidence / explainability policy.
 */
import { validateFinancialPrediction } from '../prediction-adapter/financialPredictionAdapter.js';

export function assessFinancialPredictionDisplayability(prediction) {
  const validation = validateFinancialPrediction(prediction);
  const score = Number(prediction?.confidence_score);
  const bandValid =
    Number.isFinite(Number(prediction?.confidence_band_low)) &&
    Number.isFinite(Number(prediction?.confidence_band_high));
  const explanationValid =
    Boolean(prediction?.explanation?.source) &&
    Boolean(prediction?.explanation?.horizon) &&
    Array.isArray(prediction?.explanation?.evidence) &&
    prediction.explanation.evidence.length > 0 &&
    Array.isArray(prediction?.explanation?.limitations) &&
    prediction.explanation.limitations.length > 0;

  const issues = [
    ...validation.issues,
    ...(!Number.isFinite(score) || score < 0 || score > 1
      ? ['confidence score must be between 0 and 1']
      : []),
    ...(!bandValid ? ['confidence band required'] : []),
    ...(!explanationValid ? ['complete explanation required'] : [])
  ];

  return Object.freeze({
    displayable: issues.length === 0,
    confidenceLevel:
      Number.isFinite(score) && score >= 0.75
        ? 'high'
        : Number.isFinite(score) && score >= 0.5
          ? 'medium'
          : 'low',
    issues: Object.freeze(issues)
  });
}

export function filterDisplayableFinancialPredictions(predictions = []) {
  return Object.freeze(
    predictions.filter((prediction) => assessFinancialPredictionDisplayability(prediction).displayable)
  );
}

