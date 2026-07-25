/**
 * FIN-CERT-001 — Consolidated operational readiness.
 */
import { validateFinVal001 } from '../../validation/finance/api/finValApi.js';
import { FINANCE_EVENTS } from '../../../domains/finance/observability/financeObservability.js';
import { FIN_EVOLVE_23_SCOPE } from '../../../domains/finance/whatif/scenario-engine/whatIfConstants.js';
import {
  validateFinancialPredictionAdapter
} from '../../../domains/finance/prediction/prediction-adapter/financialPredictionAdapter.js';
import {
  validateFinancePredictionObservability
} from '../../../domains/finance/prediction/observability/financePredictionObservability.js';
import { FINANCE_WORKSPACE_INTEGRATIONS } from '../../../domains/finance/integration/financeIntegrationLayer.js';

export const FINANCE_OPERATIONAL_READINESS_MATRIX = Object.freeze([
  Object.freeze({
    id: 'observability',
    evidence: 'finance.* event catalog + FIN-VAL-001',
    status: 'READY'
  }),
  Object.freeze({
    id: 'explainability',
    evidence: 'Economic Intelligence trace + What-if explainability + Prediction explanation',
    status: 'READY'
  }),
  Object.freeze({
    id: 'confidence',
    evidence: 'platform.prediction.v0 mandatory confidence contract',
    status: 'READY'
  }),
  Object.freeze({
    id: 'trace',
    evidence: 'Economic trace, scenarioId, prediction trace_id',
    status: 'READY'
  }),
  Object.freeze({
    id: 'evidence',
    evidence: 'contractsUsed, evidenceConsumed and evidence_refs',
    status: 'READY'
  }),
  Object.freeze({
    id: 'hub_integration',
    evidence: 'FinanceExecutiveDashboard composition',
    status: 'READY'
  }),
  Object.freeze({
    id: 'twin_integration',
    evidence: 'Finance financial overlay + semantic temporal lanes',
    status: 'READY'
  }),
  Object.freeze({
    id: 'what_if_integration',
    evidence: 'temporary scenario composition + official prediction comparison',
    status: 'READY'
  })
]);

export function assessFinanceOperationalReadiness() {
  const finVal = validateFinVal001();
  const predictionAdapter = validateFinancialPredictionAdapter();
  const predictionObservability = validateFinancePredictionObservability();
  const eventValues = Object.values(FINANCE_EVENTS);
  const integrations = new Set(FINANCE_WORKSPACE_INTEGRATIONS.map((item) => item.id));

  const checks = Object.freeze({
    validationHarness: finVal.valid,
    observability:
      eventValues.filter((event) => String(event).startsWith('finance.')).length >= 21 &&
      predictionObservability.valid,
    explainability: finVal.report?.metrics?.explainability_ok === true,
    confidence: predictionAdapter.valid,
    traceAndEvidence: finVal.report?.status === 'PASS',
    hubIntegration: finVal.report?.metrics?.journeys_pass === true,
    twinIntegration: finVal.report?.metrics?.twin_ok === true && integrations.has('twin'),
    whatIfIntegration:
      FIN_EVOLVE_23_SCOPE.mutatesOperational === false && integrations.has('whatif'),
    predictionIntegration: integrations.has('prediction')
  });

  const issues = [
    ...finVal.issues,
    ...predictionAdapter.issues,
    ...predictionObservability.issues,
    ...Object.entries(checks)
      .filter(([, pass]) => !pass)
      .map(([id]) => `readiness check failed: ${id}`),
    ...FINANCE_OPERATIONAL_READINESS_MATRIX
      .filter((item) => item.status !== 'READY')
      .map((item) => `${item.id}: not ready`)
  ];

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    matrix: FINANCE_OPERATIONAL_READINESS_MATRIX,
    checks,
    eventCount: eventValues.filter((event) => String(event).startsWith('finance.')).length
  });
}

export function validateFinanceOperationalReadiness() {
  return assessFinanceOperationalReadiness();
}

