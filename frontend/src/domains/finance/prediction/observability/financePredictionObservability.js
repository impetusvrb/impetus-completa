/**
 * FIN-EVOLVE-2.4 — Prediction observability facade.
 */
export {
  trackPredictionRequested,
  trackPredictionReceived,
  trackPredictionDisplayed,
  trackPredictionCompared,
  trackPredictionRejected
} from '../../observability/financeObservability.js';

import { FINANCE_EVENTS } from '../../observability/financeObservability.js';

export const FINANCE_PREDICTION_EVENTS = Object.freeze([
  'finance.prediction.requested',
  'finance.prediction.received',
  'finance.prediction.displayed',
  'finance.prediction.compared',
  'finance.prediction.rejected'
]);

export function validateFinancePredictionObservability() {
  const values = new Set(Object.values(FINANCE_EVENTS));
  const missing = FINANCE_PREDICTION_EVENTS.filter((event) => !values.has(event));
  return { valid: missing.length === 0, issues: missing.map((event) => `missing ${event}`) };
}

