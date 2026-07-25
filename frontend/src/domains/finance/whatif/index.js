/**
 * FIN-EVOLVE-2.3 — What-if module barrel.
 */
export {
  FIN_EVOLVE_23_PHASE,
  FIN_EVOLVE_23_PRINCIPLE,
  FIN_EVOLVE_23_SCOPE,
  FORBIDDEN_IN_EVOLVE_23,
  WHATIF_SCENARIO_STATUS
} from './scenario-engine/whatIfConstants.js';

export {
  WHATIF_VARIABLES,
  listWhatIfVariableIds,
  getWhatIfVariable,
  validateWhatIfVariablesCatalog
} from './scenario-engine/whatIfVariables.js';

export { applyHypotheses, deepClone } from './scenario-engine/applyHypotheses.js';

export {
  createWhatIfScenario,
  getWhatIfScenario,
  listWhatIfScenarios,
  setWhatIfParameter,
  calculateWhatIfScenario,
  discardWhatIfScenario,
  clearAllWhatIfScenarios,
  validateScenarioCompositionEngine
} from './scenario-engine/scenarioCompositionEngine.js';

export {
  compareEconomicImpact,
  validateEconomicImpactComparison
} from './comparison/economicImpactComparison.js';

export {
  provideWhatIfSession,
  validateWhatIfProvider
} from './providers/whatIfScenarioProvider.js';

export {
  trackWhatIfStarted,
  trackWhatIfParameterChanged,
  trackWhatIfCalculated,
  trackWhatIfDiscarded,
  WHATIF_OBSERVABILITY_EVENTS,
  validateWhatIfObservability
} from './observability/whatIfObservability.js';

export { default as FinanceWhatIfView } from './scenario-view/FinanceWhatIfView.jsx';
export { default as FinanceWhatIfHubCard } from './scenario-view/FinanceWhatIfHubCard.jsx';
export { default as EconomicImpactComparisonPanel } from './comparison/EconomicImpactComparisonPanel.jsx';
