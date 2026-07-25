/**
 * FIN-VAL-001 — Read-only validation API.
 */
import {
  FIN_VAL_001_PHASE,
  FIN_VAL_001_PRINCIPLE,
  FIN_VAL_001_SCOPE
} from '../finVal001Constants.js';
import { FIN_VAL_JOURNEYS, FIN_VAL_PRIMARY_JOURNEY, validateFinValJourneys } from '../journeys/finValJourneys.js';
import { FIN_VAL_EXCEPTION_SCENARIOS, validateFinValScenarios } from '../scenarios/finValScenarios.js';
import {
  FIN_VAL_METRIC_THRESHOLDS,
  FIN_VAL_REQUIRED_OBSERVABILITY_EVENTS,
  validateFinValMetricsCatalog
} from '../metrics/finValMetrics.js';
import {
  FIN_VAL_GATE_CRITERIA,
  evaluateFinEvolve23Gate,
  validateFinValGateCatalog
} from '../gate/finValGate.js';
import { runFinanceOperationalValidation } from '../harness/finValHarness.js';

export function getFinanceValidationAudit() {
  const report = runFinanceOperationalValidation();
  return Object.freeze({
    phase: FIN_VAL_001_PHASE,
    principle: FIN_VAL_001_PRINCIPLE,
    scope: FIN_VAL_001_SCOPE,
    journeys: FIN_VAL_JOURNEYS,
    primaryJourney: FIN_VAL_PRIMARY_JOURNEY,
    exceptions: FIN_VAL_EXCEPTION_SCENARIOS,
    thresholds: FIN_VAL_METRIC_THRESHOLDS,
    observabilityEvents: FIN_VAL_REQUIRED_OBSERVABILITY_EVENTS,
    gateCriteria: FIN_VAL_GATE_CRITERIA,
    report,
    next: Object.freeze({
      ifPass: 'FIN-EVOLVE-2.3 — What-if Analysis',
      ifHold: 'Corrigir findings FAIL antes de expandir',
      stillClosed: Object.freeze(['prediction', 'capex', 'managerial_consolidation'])
    })
  });
}

export function validateFinVal001() {
  const parts = [
    validateFinValJourneys(),
    validateFinValScenarios(),
    validateFinValMetricsCatalog(),
    validateFinValGateCatalog()
  ];
  const report = runFinanceOperationalValidation();
  const issues = [
    ...parts.flatMap((p) => p.issues || []),
    ...(report.status !== 'PASS' ? [`validation status ${report.status}`] : []),
    ...(report.gate.openFinEvolve23 ? [] : [`gate HOLD: ${report.gate.failed.join(',')}`])
  ];
  return {
    valid: parts.every((p) => p.valid) && report.status === 'PASS' && report.gate.openFinEvolve23,
    issues,
    report
  };
}

export {
  FIN_VAL_001_PHASE,
  FIN_VAL_001_PRINCIPLE,
  FIN_VAL_JOURNEYS,
  FIN_VAL_EXCEPTION_SCENARIOS,
  FIN_VAL_METRIC_THRESHOLDS,
  FIN_VAL_GATE_CRITERIA,
  runFinanceOperationalValidation,
  evaluateFinEvolve23Gate
};
