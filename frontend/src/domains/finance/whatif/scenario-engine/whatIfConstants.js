/**
 * FIN-EVOLVE-2.3 — Financial What-if Analysis
 * Principle: SIMULATE WITHOUT MUTATING
 * Temporary in-memory composition only — no operational mutation, no prediction.
 */
export const FIN_EVOLVE_23_PHASE = 'FIN-EVOLVE-2.3';
export const FIN_EVOLVE_23_PRINCIPLE = 'SIMULATE WITHOUT MUTATING';
export const FIN_EVOLVE_23_RELEASE = '2.3';

export const FIN_EVOLVE_23_SCOPE = Object.freeze({
  mutatesOperational: false,
  mutatesIndustrialTwin: false,
  persistenceRequired: false,
  prediction: false,
  generativeAi: false,
  autoOptimization: false,
  consumerOf: Object.freeze([
    'FinancialDigitalTwinComposition',
    'EconomicIntelligenceEngine',
    'finance.driver_rate.v1',
    'finance.asset_cost_map.v1',
    'finance.wms_valuation.v1',
    'dashboard.costs',
    'dashboard.financialLeakage'
  ])
});

export const FORBIDDEN_IN_EVOLVE_23 = Object.freeze([
  'prediction',
  'generative_ai',
  'auto_optimization',
  'autonomous_recommendations',
  'machine_learning',
  'mandatory_persistence',
  'operational_mutation'
]);

export const WHATIF_SCENARIO_STATUS = Object.freeze({
  DRAFT: 'draft',
  CALCULATED: 'calculated',
  DISCARDED: 'discarded'
});
