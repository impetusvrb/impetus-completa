/**
 * FIN-EVOLVE-2.3 — Scenario Composition Engine
 * Temporary in-memory scenarios with scenarioId isolation.
 * Principle: SIMULATE WITHOUT MUTATING
 */
import {
  FIN_EVOLVE_23_PHASE,
  FIN_EVOLVE_23_PRINCIPLE,
  FIN_EVOLVE_23_SCOPE,
  WHATIF_SCENARIO_STATUS
} from './whatIfConstants.js';
import { applyHypotheses, deepClone } from './applyHypotheses.js';
import { validateWhatIfVariablesCatalog } from './whatIfVariables.js';
import { runEconomicIntelligence } from '../../economic-engine/economicIntelligenceEngine.js';
import { provideFinancialTwinState } from '../../twin/providers/financialTwinStateProvider.js';
import {
  compareEconomicImpact,
  validateEconomicImpactComparison
} from '../comparison/economicImpactComparison.js';
import {
  trackWhatIfStarted,
  trackWhatIfParameterChanged,
  trackWhatIfCalculated,
  trackWhatIfDiscarded
} from '../observability/whatIfObservability.js';

/** @type {Map<string, object>} Isolated scenario contexts — never shared */
const SCENARIO_REGISTRY = new Map();

let _seq = 0;

function newScenarioId() {
  _seq += 1;
  return `wif-${Date.now().toString(36)}-${_seq}-${Math.random().toString(36).slice(2, 8)}`;
}

function snapshot(session) {
  if (!session) return null;
  return Object.freeze({
    scenarioId: session.scenarioId,
    label: session.label,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    hypotheses: Object.freeze({ ...session.hypotheses }),
    comparison: session.comparison,
    baselineEconomic: session.baselineEconomic
      ? Object.freeze({
          unitCost: session.baselineEconomic.smartCosting?.unitCost?.value ?? null,
          efficiency: session.baselineEconomic.performance?.indicators?.economicEfficiency?.value ?? null,
          losses: session.baselineEconomic.performance?.indicators?.economicLosses?.value ?? null,
          costReal: session.baselineEconomic.performance?.indicators?.costReal?.value ?? null
        })
      : null,
    simulatedEconomic: session.simulatedEconomic
      ? Object.freeze({
          unitCost: session.simulatedEconomic.smartCosting?.unitCost?.value ?? null,
          efficiency: session.simulatedEconomic.performance?.indicators?.economicEfficiency?.value ?? null,
          losses: session.simulatedEconomic.performance?.indicators?.economicLosses?.value ?? null,
          costReal: session.simulatedEconomic.performance?.indicators?.costReal?.value ?? null
        })
      : null,
    twinBaselineSummary: session.twinBaseline?.overlay?.summary || null,
    twinSimulatedSummary: session.twinSimulated?.overlay?.summary || null,
    mutatesOperational: false,
    persistence: false,
    phase: FIN_EVOLVE_23_PHASE,
    principle: FIN_EVOLVE_23_PRINCIPLE,
    isolation: Object.freeze({
      scenarioId: session.scenarioId,
      independentContext: true,
      crossScenarioInfluence: false
    })
  });
}

/**
 * Create an isolated temporary scenario from current twin / economic baseline input.
 * @param {object} opts
 * @param {object} opts.baselineInput — economic engine input (cloned; never mutated)
 * @param {object} [opts.hypotheses]
 * @param {string} [opts.label]
 * @param {boolean} [opts.emitEvents=true]
 */
export function createWhatIfScenario(opts = {}) {
  const scenarioId = newScenarioId();
  const baselineInput = deepClone(opts.baselineInput || {});
  baselineInput.emitEvents = false;

  const session = {
    scenarioId,
    label: opts.label || `Cenário ${scenarioId}`,
    status: WHATIF_SCENARIO_STATUS.DRAFT,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hypotheses: { ...(opts.hypotheses || {}) },
    baselineInput,
    baselineEconomic: null,
    simulatedEconomic: null,
    twinBaseline: null,
    twinSimulated: null,
    comparison: null,
    applied: [],
    contractsUsed: []
  };

  SCENARIO_REGISTRY.set(scenarioId, session);

  if (opts.emitEvents !== false) {
    trackWhatIfStarted({ scenarioId, label: session.label });
  }

  return snapshot(session);
}

export function getWhatIfScenario(scenarioId) {
  return snapshot(SCENARIO_REGISTRY.get(scenarioId));
}

export function listWhatIfScenarios() {
  return Object.freeze([...SCENARIO_REGISTRY.keys()].map((id) => snapshot(SCENARIO_REGISTRY.get(id))));
}

/**
 * Update a hypothesis on one scenario only — no cross-scenario leakage.
 */
export function setWhatIfParameter(scenarioId, key, value, opts = {}) {
  const session = SCENARIO_REGISTRY.get(scenarioId);
  if (!session || session.status === WHATIF_SCENARIO_STATUS.DISCARDED) {
    return { ok: false, error: 'scenario_not_found', scenarioId };
  }
  session.hypotheses = { ...session.hypotheses, [key]: value };
  session.status = WHATIF_SCENARIO_STATUS.DRAFT;
  session.comparison = null;
  session.simulatedEconomic = null;
  session.updatedAt = Date.now();

  if (opts.emitEvents !== false) {
    trackWhatIfParameterChanged({ scenarioId, key, value });
  }
  return { ok: true, scenario: snapshot(session) };
}

/**
 * Compose temporary simulated state via Economic Intelligence + Twin provider.
 * Baseline operational input remains untouched.
 */
export function calculateWhatIfScenario(scenarioId, opts = {}) {
  const session = SCENARIO_REGISTRY.get(scenarioId);
  if (!session || session.status === WHATIF_SCENARIO_STATUS.DISCARDED) {
    return { ok: false, error: 'scenario_not_found', scenarioId };
  }

  const baselineFingerprint = JSON.stringify(session.baselineInput);
  const baselineEconomic = runEconomicIntelligence({
    ...deepClone(session.baselineInput),
    emitEvents: false
  });

  const hypo = applyHypotheses(session.baselineInput, session.hypotheses);
  const baselineUntouchedAfterHypo = JSON.stringify(session.baselineInput) === baselineFingerprint;

  const simulatedEconomic = runEconomicIntelligence({
    ...hypo.input,
    emitEvents: false
  });
  const baselineUntouchedAfterSim =
    JSON.stringify(session.baselineInput) === baselineFingerprint;

  let twinBaseline = null;
  let twinSimulated = null;
  if (opts.includeTwin !== false) {
    twinBaseline = provideFinancialTwinState({
      ...session.baselineInput,
      economicSnapshot: baselineEconomic,
      emitEvents: false
    });
    twinSimulated = provideFinancialTwinState({
      ...hypo.input,
      economicSnapshot: simulatedEconomic,
      emitEvents: false
    });
  }

  const comparison = compareEconomicImpact(baselineEconomic, simulatedEconomic, {
    scenarioId,
    hypothesesApplied: hypo.applied,
    contractsUsed: hypo.contractsUsed,
    evidenceConsumed: [
      'scenario.baselineInput',
      'scenario.hypotheses',
      twinBaseline ? 'financial_twin_state.baseline' : null,
      twinSimulated ? 'financial_twin_state.simulated' : null
    ].filter(Boolean),
    trace: [
      { step: 'whatif_apply_hypotheses', count: hypo.applied.length, ts: Date.now() },
      { step: 'whatif_compare', scenarioId, ts: Date.now() }
    ]
  });

  session.baselineEconomic = baselineEconomic;
  session.simulatedEconomic = simulatedEconomic;
  session.twinBaseline = twinBaseline;
  session.twinSimulated = twinSimulated;
  session.comparison = comparison;
  session.applied = hypo.applied;
  session.contractsUsed = hypo.contractsUsed;
  session.status = WHATIF_SCENARIO_STATUS.CALCULATED;
  session.updatedAt = Date.now();
  session.baselineUntouched =
    hypo.baselineUntouched && baselineUntouchedAfterHypo && baselineUntouchedAfterSim;

  if (opts.emitEvents !== false) {
    trackWhatIfCalculated({
      scenarioId,
      metricCount: comparison.metrics.length,
      hypothesisCount: hypo.applied.length
    });
  }

  return {
    ok: true,
    scenario: snapshot(session),
    comparison,
    baselineUntouched: session.baselineUntouched,
    mutatesOperational: false
  };
}

/**
 * Discard scenario — removes independent context from registry.
 */
export function discardWhatIfScenario(scenarioId, opts = {}) {
  const session = SCENARIO_REGISTRY.get(scenarioId);
  if (!session) {
    return { ok: false, error: 'scenario_not_found', scenarioId };
  }
  session.status = WHATIF_SCENARIO_STATUS.DISCARDED;
  SCENARIO_REGISTRY.delete(scenarioId);

  if (opts.emitEvents !== false) {
    trackWhatIfDiscarded({ scenarioId });
  }

  return {
    ok: true,
    scenarioId,
    discarded: true,
    remaining: SCENARIO_REGISTRY.size
  };
}

/** Test / housekeeping — clear all temporary scenarios */
export function clearAllWhatIfScenarios() {
  const n = SCENARIO_REGISTRY.size;
  SCENARIO_REGISTRY.clear();
  return { cleared: n };
}

export function validateScenarioCompositionEngine() {
  const issues = [];
  const vars = validateWhatIfVariablesCatalog();
  if (!vars.valid) issues.push(...vars.issues);
  if (FIN_EVOLVE_23_SCOPE.mutatesOperational) issues.push('scope must forbid operational mutation');
  if (FIN_EVOLVE_23_SCOPE.prediction) issues.push('scope must forbid prediction');
  return {
    valid: issues.length === 0,
    issues,
    phase: FIN_EVOLVE_23_PHASE,
    principle: FIN_EVOLVE_23_PRINCIPLE
  };
}

export {
  compareEconomicImpact,
  validateEconomicImpactComparison,
  SCENARIO_REGISTRY
};
