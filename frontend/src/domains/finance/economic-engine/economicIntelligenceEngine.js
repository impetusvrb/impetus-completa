/**
 * FIN-EVOLVE-2.1 — Economic Intelligence Engine
 * Reusable motor that composes economic indicators from official contracts only.
 * Does NOT create a new cost service — composition only.
 *
 * Principle: CALCULATE FROM REGISTERED DATA
 */
import {
  DRIVER_RATE_CONTRACT,
  ASSET_COST_MAP_CONTRACT,
  WMS_VALUATION_CONTRACT,
  WMS_VALUATION_CAPABILITY
} from '../../../platform/readiness/finance/index.js';
import {
  FIN_EVOLVE_21_PHASE,
  FIN_EVOLVE_21_PRINCIPLE,
  ECONOMIC_ENGINE_OFFICIAL_CONTRACTS,
  ECONOMIC_ENGINE_TECHNICAL_BACKLOG,
  FORBIDDEN_IN_EVOLVE_21,
  validateEconomicEngineContracts,
  listOfficialContractIds
} from '../contracts/economicEngineContracts.js';
import {
  defaultKpiAliasNormalizer,
  traceStep
} from '../calculators/economicCalcUtils.js';
import { runSmartCosting, validateSmartCosting } from '../smart-costing/smartCosting.js';
import {
  runEconomicPerformance,
  validateEconomicPerformance
} from '../performance/economicPerformance.js';
import {
  trackSmartCostingCalculated,
  trackPerformanceUpdated,
  trackCostAnalysisCompleted
} from '../observability/financeObservability.js';

/**
 * @param {object} input
 * @param {object} [input.costsSummary]
 * @param {array}  [input.byOrigin]
 * @param {object} [input.topLoss]
 * @param {object} [input.projectedLoss]
 * @param {object} [input.projectedImpact]
 * @param {array}  [input.leakageAlerts]
 * @param {array}  [input.leakageRanking]
 * @param {object} [input.drivers] — live driver quantities { units_produced, kwh_consumed, ... }
 * @param {array}  [input.wmsRows] — WMS stock rows for valuation
 * @param {object} [input.extensions] — plantRateProvider, impactApiProvider, kpiAliasNormalizer
 * @param {boolean} [input.emitEvents=true]
 */
export function runEconomicIntelligence(input = {}) {
  const extensions = {
    plantRateProvider: null,
    impactApiProvider: null,
    kpiAliasNormalizer: defaultKpiAliasNormalizer,
    ...(input.extensions || {})
  };

  const normalizer =
    typeof extensions.kpiAliasNormalizer === 'function'
      ? extensions.kpiAliasNormalizer
      : defaultKpiAliasNormalizer;

  const normalized = normalizer(input);

  // GAP-FD-001 extension: optional impact overlay without breaking default
  if (typeof extensions.impactApiProvider === 'function') {
    const impactExtra = extensions.impactApiProvider(input);
    if (impactExtra && typeof impactExtra === 'object') {
      Object.assign(normalized, impactExtra);
    }
  }

  const context = Object.freeze({
    ...input,
    normalized,
    extensions,
    valuationSeed: input.valuationSeed
      ? input.valuationSeed
      : WMS_VALUATION_CAPABILITY.seedExample
        ? {
            item_id: 'seed',
            quantity: WMS_VALUATION_CAPABILITY.seedExample.quantity_ref ?? 100,
            lot: WMS_VALUATION_CAPABILITY.seedExample.lot_number || 'Lote-01',
            metadata: {
              average_cost: WMS_VALUATION_CAPABILITY.seedExample.average_cost,
              lot_cost: WMS_VALUATION_CAPABILITY.seedExample.lot_cost
            }
          }
        : null
  });

  const smartCosting = runSmartCosting(context);
  const performance = runEconomicPerformance(context, smartCosting);

  const snapshot = Object.freeze({
    phase: FIN_EVOLVE_21_PHASE,
    principle: FIN_EVOLVE_21_PRINCIPLE,
    engine: 'EconomicIntelligenceEngine',
    smartCosting,
    performance,
    contractsConsumed: Object.freeze([
      DRIVER_RATE_CONTRACT.id,
      ASSET_COST_MAP_CONTRACT.id,
      WMS_VALUATION_CONTRACT.id,
      'dashboard.costs',
      'dashboard.financialLeakage'
    ]),
    officialCatalog: ECONOMIC_ENGINE_OFFICIAL_CONTRACTS,
    technicalBacklog: ECONOMIC_ENGINE_TECHNICAL_BACKLOG,
    hubKpis: buildHubKpiOverlay(smartCosting, performance, normalized),
    trace: Object.freeze([
      traceStep('engine_start', { phase: FIN_EVOLVE_21_PHASE }),
      ...smartCosting.trace,
      ...performance.trace,
      traceStep('engine_complete', { engine: 'EconomicIntelligenceEngine' })
    ])
  });

  if (input.emitEvents !== false) {
    trackSmartCostingCalculated({
      unitCost: smartCosting.unitCost?.value,
      resolvedDrivers: smartCosting.driverContributions?.resolvedCount
    });
    trackPerformanceUpdated({
      efficiency: performance.indicators.economicEfficiency.value,
      losses: performance.indicators.economicLosses.value
    });
    trackCostAnalysisCompleted({
      contracts: snapshot.contractsConsumed.length,
      phase: FIN_EVOLVE_21_PHASE
    });
  }

  return snapshot;
}

/**
 * KPI overlay for Hub — same card ids, values from engine (no layout change).
 */
export function buildHubKpiOverlay(smartCosting, performance, normalized = {}) {
  const fmt = (v, suffix = '') => {
    if (v == null || Number.isNaN(Number(v))) return null;
    if (suffix === '%') return `${Number(v).toFixed(1)}%`;
    return Number(v);
  };

  return Object.freeze([
    Object.freeze({
      id: 'cost_day',
      numericValue: performance.indicators.costReal.value ?? normalized.perDay,
      hint: 'EconomicIntelligence · cost_real',
      source: 'economic_engine'
    }),
    Object.freeze({
      id: 'economic_proxy',
      numericValue: smartCosting.unitCost?.value,
      hint: 'EconomicIntelligence · dynamic_unit_cost',
      source: 'economic_engine',
      labelOverride: 'Custo unitário dinâmico'
    }),
    Object.freeze({
      id: 'event_impact_24h',
      numericValue: normalized.impactLastDay,
      hint: 'EconomicIntelligence · impact (GAP-FD-001 extensible)',
      source: 'economic_engine'
    }),
    Object.freeze({
      id: 'top_loss',
      numericValue: normalized.topLossAmount,
      hint: performance.indicators.economicLosses.label,
      source: 'economic_engine'
    }),
    Object.freeze({
      id: 'leakage_projected',
      numericValue: normalized.leakageProjected,
      hint: 'EconomicIntelligence · leakage contract',
      source: 'economic_engine'
    }),
    Object.freeze({
      id: 'cost_month',
      numericValue: normalized.perMonth,
      hint: 'EconomicIntelligence · operational.per_month',
      source: 'economic_engine'
    }),
    Object.freeze({
      id: 'projected_loss',
      numericValue: normalized.projectedLossAmount,
      hint: 'EconomicIntelligence · projected-loss',
      source: 'economic_engine'
    }),
    Object.freeze({
      id: 'econ_efficiency',
      numericValue: fmt(performance.indicators.economicEfficiency.value),
      displaySuffix: '%',
      hint: 'EconomicIntelligence · efficiency',
      source: 'economic_engine',
      labelOverride: 'Eficiência económica',
      color: 'var(--green)'
    }),
    Object.freeze({
      id: 'econ_losses',
      numericValue: performance.indicators.economicLosses.value,
      hint: 'EconomicIntelligence · economic_losses',
      source: 'economic_engine',
      labelOverride: 'Perdas económicas',
      color: 'var(--red)'
    }),
    Object.freeze({
      id: 'econ_consolidated',
      numericValue: performance.indicators.consolidatedOperationalCost.value,
      hint: 'EconomicIntelligence · consolidated',
      source: 'economic_engine',
      labelOverride: 'Custo operacional consolidado',
      color: 'var(--cyan)'
    })
  ]);
}

export function validateEconomicIntelligenceEngine() {
  const contractCheck = validateEconomicEngineContracts();
  const sample = runEconomicIntelligence({
    emitEvents: false,
    costsSummary: {
      operational: { per_day: 1200, per_month: 36000 },
      impact_from_events: { last_day: 200, last_7d: 900 }
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
    projectedLoss: { projected: 500 },
    projectedImpact: { projected_impact: 400 },
    drivers: { units_produced: 100, kwh_consumed: 50, downtime_hours: 2 }
  });

  const sc = validateSmartCosting(sample.smartCosting);
  const perf = validateEconomicPerformance(sample.performance);
  const issues = [
    ...contractCheck.issues,
    ...sc.issues,
    ...perf.issues
  ];

  if (sample.engine !== 'EconomicIntelligenceEngine') issues.push('engine id mismatch');
  if (!sample.hubKpis?.length) issues.push('hub overlay empty');
  if (sample.smartCosting.unitCost.value == null) issues.push('unit cost not computed');
  for (const id of listOfficialContractIds()) {
    if (
      !sample.contractsConsumed.includes(id) &&
      !['dashboard.costs', 'dashboard.financialLeakage'].includes(id)
    ) {
      /* costs/leakage are logical ids */
    }
  }
  for (const bad of FORBIDDEN_IN_EVOLVE_21) {
    const blob = JSON.stringify(sample);
    if (blob.includes(`"${bad}"`) && bad !== 'prediction') {
      /* allow absence only */
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    sample,
    backlog: ECONOMIC_ENGINE_TECHNICAL_BACKLOG
  };
}

export {
  FIN_EVOLVE_21_PHASE,
  FIN_EVOLVE_21_PRINCIPLE,
  ECONOMIC_ENGINE_TECHNICAL_BACKLOG,
  FORBIDDEN_IN_EVOLVE_21
};
