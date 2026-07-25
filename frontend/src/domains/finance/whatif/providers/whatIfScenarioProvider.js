/**
 * FIN-EVOLVE-2.3 — High-level What-if provider (Twin + Engine consumers).
 */
import {
  createWhatIfScenario,
  setWhatIfParameter,
  calculateWhatIfScenario,
  discardWhatIfScenario,
  getWhatIfScenario,
  listWhatIfScenarios,
  clearAllWhatIfScenarios,
  validateScenarioCompositionEngine
} from '../scenario-engine/scenarioCompositionEngine.js';
import { WHATIF_VARIABLES, validateWhatIfVariablesCatalog } from '../scenario-engine/whatIfVariables.js';
import {
  FIN_EVOLVE_23_PHASE,
  FIN_EVOLVE_23_PRINCIPLE,
  FIN_EVOLVE_23_SCOPE
} from '../scenario-engine/whatIfConstants.js';
import { provideFinancialTwinState } from '../../twin/providers/financialTwinStateProvider.js';
import { runEconomicIntelligence } from '../../economic-engine/economicIntelligenceEngine.js';

/**
 * Bootstrap a what-if session from live twin/economic inputs.
 * Does not mutate operational stores.
 */
export function provideWhatIfSession(input = {}) {
  const emitEvents = input.emitEvents !== false;
  const economic =
    input.economicSnapshot ||
    runEconomicIntelligence({
      ...input,
      emitEvents: false
    });

  const twinState =
    input.financialTwinState ||
    provideFinancialTwinState({
      ...input,
      economicSnapshot: economic,
      emitEvents: false
    });

  const scenario = createWhatIfScenario({
    baselineInput: {
      costsSummary: input.costsSummary,
      byOrigin: input.byOrigin,
      topLoss: input.topLoss,
      projectedLoss: input.projectedLoss,
      projectedImpact: input.projectedImpact,
      leakageAlerts: input.leakageAlerts,
      leakageRanking: input.leakageRanking,
      drivers: input.drivers,
      wmsRows: input.wmsRows,
      valuationSeed: input.valuationSeed,
      industrialTwinState: input.industrialTwinState
    },
    hypotheses: input.hypotheses || {},
    label: input.label,
    emitEvents
  });

  return Object.freeze({
    kind: 'whatif_session',
    phase: FIN_EVOLVE_23_PHASE,
    principle: FIN_EVOLVE_23_PRINCIPLE,
    scope: FIN_EVOLVE_23_SCOPE,
    scenarioId: scenario.scenarioId,
    scenario,
    twinSummary: twinState?.overlay?.summary || null,
    variables: WHATIF_VARIABLES,
    path: '/app/finance/whatif',
    twinPath: '/app/finance/twin',
    mutatesOperational: false,
    persistence: false
  });
}

export function validateWhatIfProvider(session) {
  const issues = [];
  if (!session || session.kind !== 'whatif_session') issues.push('missing whatif_session');
  if (!session?.scenarioId) issues.push('missing scenarioId');
  if (session?.mutatesOperational) issues.push('must not mutate operational');
  if (session?.persistence) issues.push('must not require persistence');
  return { valid: issues.length === 0, issues };
}

export {
  createWhatIfScenario,
  setWhatIfParameter,
  calculateWhatIfScenario,
  discardWhatIfScenario,
  getWhatIfScenario,
  listWhatIfScenarios,
  clearAllWhatIfScenarios,
  validateScenarioCompositionEngine,
  validateWhatIfVariablesCatalog,
  WHATIF_VARIABLES
};
