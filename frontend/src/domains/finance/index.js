/**
 * FIN-EVOLVE-001 — Finance Domain Evolution (Phase A — Integration First).
 * FIN-EVOLVE-001A — Domain Experience Consolidation exports.
 */
export {
  FIN_EVOLVE_001_PHASE,
  FIN_EVOLVE_001_STRATEGY,
  FIN_EVOLVE_001_PRINCIPLE,
  FINANCE_CAPABILITY_REGISTRY,
  getFinanceCapability,
  validateFinanceCapabilityRegistry
} from './registry/financeCapabilityRegistry.js';

export {
  FINANCE_INTEGRATION_LAYER_ID,
  FINANCE_WORKSPACE_INTEGRATIONS,
  buildFinanceIntegrationSnapshot,
  getFinanceIntegration,
  resolveFinanceModuleByPath
} from './integration/financeIntegrationLayer.js';

export {
  FINANCE_PUBLIC_CONTRACTS,
  getFinancePublicContract,
  validateFinancePublicContracts
} from './contracts/financePublicContracts.js';

export {
  FIN_EVOLVE_001A_PHASE,
  FIN_STAB_001_PHASE,
  FINANCE_DOMAIN_ID,
  FINANCE_DOMAIN_IDENTITY,
  FINANCE_EOX_DOMAIN_ENTRY,
  FINANCE_DOMAIN_METADATA_REGISTRY,
  getFinanceDomainIdentity,
  validateFinanceDomainMetadata
} from './metadata/financeDomainMetadata.js';

export {
  FINANCE_SIDEBAR_MENU_ITEMS,
  FINANCE_OFFICIAL_DEEP_LINKS,
  FINANCE_CONTEXTUAL_MENU_OVERRIDES,
  getFinanceOfficialRoute,
  getFinanceDeepLink,
  buildFinanceBreadcrumb,
  buildFinanceEoxNavigationConfig
} from './metadata/financeNavigationMetadata.js';

export {
  FINANCE_LEGACY_REDIRECTS,
  isFinanceLegacyPath,
  resolveLegacyFinanceRedirect,
  getFinanceLegacyRedirectRegistry,
  validateFinanceLegacyCompatibility
} from './compatibility/financeLegacyCompatibility.js';

export {
  FINANCE_WORKSPACE_HIERARCHY,
  resolveFinanceWorkspace,
  resolveFinanceWorkspaceModule
} from './experience/financeWorkspaceResolver.js';

export {
  FINANCE_DOMAIN_BASE,
  FINANCE_DOMAIN_PATHS,
  canAccessFinanceDomain,
  canAccessFinanceDomainMenu,
  canAccessFinanceBilling
} from './navigation/financeAccess.js';

export {
  FINANCE_BASE_PATH,
  FINANCE_WORKSPACE_MODULES,
  FINANCE_NAV_REGISTRY,
  getFinanceModuleBySegment
} from './navigation/financeNavigationRegistry.js';

export {
  resolveFinanceOperationalNavigation,
  resolveFinanceNavigation
} from './navigation/financeEoxNavigation.js';

export {
  trackFinanceWorkspaceView,
  trackFinanceCapabilityNavigate,
  trackFinanceDomainReturn,
  trackFinanceIntegrationCompose,
  trackFinanceDashboardLoaded,
  trackFinanceKpiOpened,
  trackFinanceAlertOpened,
  trackFinanceInsightClicked,
  trackFinanceDecisionExecuted,
  trackSmartCostingCalculated,
  trackPerformanceUpdated,
  trackCostAnalysisCompleted,
  trackTwinOpened,
  trackTwinOverlayLoaded,
  trackTwinNodeSelected,
  trackTwinFinancialStateUpdated,
  trackWhatIfStarted,
  trackWhatIfParameterChanged,
  trackWhatIfCalculated,
  trackWhatIfDiscarded,
  trackPredictionRequested,
  trackPredictionReceived,
  trackPredictionDisplayed,
  trackPredictionCompared,
  trackPredictionRejected,
  FINANCE_EVENTS
} from './observability/financeObservability.js';

export {
  FIN_EVOLVE_002_PHASE,
  FIN_EVOLVE_002_PRINCIPLE,
  composeFinanceExecutiveView,
  validateFinEvolve002Compose
} from './dashboard/financeExecutiveCompose.js';

export {
  FIN_EVOLVE_21_PHASE,
  FIN_EVOLVE_21_PRINCIPLE,
  ECONOMIC_ENGINE_TECHNICAL_BACKLOG,
  runEconomicIntelligence,
  validateEconomicIntelligenceEngine,
  buildHubKpiOverlay
} from './economic-engine/economicIntelligenceEngine.js';

export { applyEconomicIntelligenceToView } from './economic-engine/applyEconomicIntelligenceToView.js';
export { runSmartCosting, validateSmartCosting } from './smart-costing/smartCosting.js';
export {
  runEconomicPerformance,
  validateEconomicPerformance
} from './performance/economicPerformance.js';
export {
  ECONOMIC_ENGINE_OFFICIAL_CONTRACTS,
  ECONOMIC_ENGINE_TECHNICAL_BACKLOG as FIN_EVOLVE_21_TECHNICAL_BACKLOG,
  validateEconomicEngineContracts,
  FORBIDDEN_IN_EVOLVE_21
} from './contracts/economicEngineContracts.js';

export {
  FIN_EVOLVE_22_PHASE,
  FIN_EVOLVE_22_PRINCIPLE,
  composeFinancialTwinOverlay,
  validateFinancialTwinOverlay,
  provideFinancialTwinState,
  validateFinancialTwinStateProvider,
  projectOperationalTwinNodes,
  joinOperationalToFinanceLinks
} from './twin/index.js';

export {
  FIN_EVOLVE_23_PHASE,
  FIN_EVOLVE_23_PRINCIPLE,
  FIN_EVOLVE_23_SCOPE,
  provideWhatIfSession,
  createWhatIfScenario,
  calculateWhatIfScenario,
  discardWhatIfScenario,
  setWhatIfParameter,
  compareEconomicImpact,
  validateScenarioCompositionEngine
} from './whatif/index.js';

export {
  FIN_EVOLVE_24_PHASE,
  FIN_EVOLVE_24_PRINCIPLE,
  FIN_EVOLVE_24_SCOPE,
  FINANCIAL_PREDICTION_TARGETS,
  FINANCIAL_PREDICTION_EXCLUDED_TARGETS,
  FINANCIAL_PREDICTION_LANES,
  extractFinancialCurrentValues,
  adaptPlatformForecastToFinance,
  requestFinancialPredictions,
  validateFinancialPrediction,
  validateFinancialPredictionAdapter,
  assessFinancialPredictionDisplayability,
  filterDisplayableFinancialPredictions,
  composeFinancialTemporalPerspective,
  comparePredictionWithWhatIf,
  validateFinancialTemporalPerspective,
  FINANCE_PREDICTION_EVENTS,
  validateFinancePredictionObservability
} from './prediction/index.js';

export { default as FinanceExecutiveDashboard } from './dashboard/FinanceExecutiveDashboard.jsx';
export { useFinanceExecutiveDashboard } from './dashboard/useFinanceExecutiveDashboard.js';

export { default as FinanceOperationalLayout } from './workspace/FinanceOperationalLayout.jsx';
export { default as FinanceNavLayout } from './workspace/FinanceNavLayout.jsx';
export { default as FinanceWorkspacePage } from './workspace/FinanceWorkspacePage.jsx';
export { default as FinanceBillingGate } from './workspace/FinanceBillingGate.jsx';
export { useFinanceOperationalNavigation } from './workspace/useFinanceOperationalNavigation.js';

import { validateFinanceCapabilityRegistry } from './registry/financeCapabilityRegistry.js';
import { validateFinancePublicContracts } from './contracts/financePublicContracts.js';
import {
  FIN_EVOLVE_001A_PHASE,
  validateFinanceDomainMetadata
} from './metadata/financeDomainMetadata.js';
import { validateFinanceLegacyCompatibility } from './compatibility/financeLegacyCompatibility.js';
import { validateFinEvolve002Compose } from './dashboard/financeExecutiveCompose.js';
import { validateEconomicIntelligenceEngine } from './economic-engine/economicIntelligenceEngine.js';
import {
  provideFinancialTwinState,
  validateFinancialTwinStateProvider
} from './twin/providers/financialTwinStateProvider.js';

export function validateFinEvolve001Integrity() {
  const checks = [
    validateFinanceCapabilityRegistry(),
    validateFinancePublicContracts(),
    validateFinanceDomainMetadata(),
    validateFinanceLegacyCompatibility()
  ];
  const issues = checks.flatMap((c) => c.issues || []);
  return {
    valid: checks.every((c) => c.valid) && issues.length === 0,
    issues,
    phase: 'FIN-EVOLVE-001'
  };
}

export function validateFinEvolve001AIntegrity() {
  const checks = [
    validateFinanceDomainMetadata(),
    validateFinanceLegacyCompatibility()
  ];
  const issues = checks.flatMap((c) => c.issues || []);
  return {
    valid: checks.every((c) => c.valid) && issues.length === 0,
    issues,
    phase: FIN_EVOLVE_001A_PHASE
  };
}

export function validateFinEvolve002Integrity() {
  const compose = validateFinEvolve002Compose();
  return {
    valid: compose.valid,
    issues: compose.issues || [],
    phase: 'FIN-EVOLVE-002'
  };
}

export function validateFinEvolve21Integrity() {
  const engine = validateEconomicIntelligenceEngine();
  return {
    valid: engine.valid,
    issues: engine.issues || [],
    phase: 'FIN-EVOLVE-2.1',
    backlog: engine.backlog
  };
}

export function validateFinEvolve22Integrity() {
  const state = provideFinancialTwinState({
    emitEvents: false,
    costsSummary: {
      operational: { per_day: 1200, per_month: 36000 },
      impact_from_events: { last_day: 200 }
    },
    byOrigin: [
      { label: 'parada', day: 80 },
      { label: 'energia', day: 40 },
      { label: 'producao', day: 100 },
      { label: 'material', day: 50 },
      { label: 'vazamento', day: 30 },
      { label: 'utilizacao', day: 20 }
    ],
    topLoss: { total: 300, origin: 'linha-A' },
    projectedImpact: { projected_impact: 400 },
    leakageAlerts: [{ title: 'Alerta', severity: 'high' }],
    drivers: { units_produced: 100 }
  });
  const v = validateFinancialTwinStateProvider(state);
  return {
    valid: v.valid && state.parallelTwin === false,
    issues: v.issues || [],
    phase: 'FIN-EVOLVE-2.2',
    state
  };
}
