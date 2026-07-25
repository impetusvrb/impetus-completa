/**
 * FIN-VAL-001 — Operational validation harness.
 * Exercises existing Finance engines (2.1 / 2.2) — no new product features.
 */
import {
  FIN_VAL_001_PHASE,
  FIN_VAL_001_PRINCIPLE,
  FIN_VAL_001_SCOPE,
  VALIDATION_STATUS
} from '../finVal001Constants.js';
import { FIN_VAL_JOURNEYS, validateFinValJourneys } from '../journeys/finValJourneys.js';
import { FIN_VAL_EXCEPTION_SCENARIOS, validateFinValScenarios } from '../scenarios/finValScenarios.js';
import {
  FIN_VAL_METRIC_THRESHOLDS,
  FIN_VAL_REQUIRED_OBSERVABILITY_EVENTS,
  validateFinValMetricsCatalog
} from '../metrics/finValMetrics.js';
import { evaluateFinEvolve23Gate, validateFinValGateCatalog } from '../gate/finValGate.js';
import { runEconomicIntelligence } from '../../../../domains/finance/economic-engine/economicIntelligenceEngine.js';
import { provideFinancialTwinState } from '../../../../domains/finance/twin/providers/financialTwinStateProvider.js';
import { composeFinanceExecutiveView } from '../../../../domains/finance/dashboard/financeExecutiveCompose.js';
import { applyEconomicIntelligenceToView } from '../../../../domains/finance/economic-engine/applyEconomicIntelligenceToView.js';
import { FINANCE_EVENTS } from '../../../../domains/finance/observability/financeObservability.js';

const BASE_INPUT = Object.freeze({
  emitEvents: false,
  costsSummary: {
    operational: { per_day: 1200, per_month: 36000 },
    impact_from_events: { last_day: 150, last_7d: 800 }
  },
  byOrigin: Object.freeze([
    { label: 'parada', day: 80 },
    { label: 'energia', day: 40 },
    { label: 'producao', day: 100 },
    { label: 'material', day: 50 },
    { label: 'vazamento', day: 30 },
    { label: 'utilizacao', day: 20 }
  ]),
  topLoss: Object.freeze({ total: 300, origin: 'linha-A' }),
  projectedLoss: Object.freeze({ projected: 450 }),
  projectedImpact: Object.freeze({ projected_impact: 400 }),
  leakageAlerts: Object.freeze([{ id: 'a1', title: 'Vazamento crítico', severity: 'high' }]),
  leakageRanking: Object.freeze([{ origin: 'setor-B', value: 250 }]),
  drivers: Object.freeze({ units_produced: 100, kwh_consumed: 40, downtime_hours: 2 })
});

function timed(fn) {
  const t0 = Date.now();
  const result = fn();
  return { result, ms: Date.now() - t0 };
}

function hasEvidence(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.evidence) return true;
  if (Array.isArray(obj.trace) && obj.trace.length) return true;
  return false;
}

/**
 * Run full FIN-VAL-001 validation suite (sync, in-process).
 */
export function runFinanceOperationalValidation() {
  const findings = [];

  // --- Catalog integrity ---
  const catalogChecks = [
    validateFinValJourneys(),
    validateFinValScenarios(),
    validateFinValMetricsCatalog(),
    validateFinValGateCatalog()
  ];
  const catalogsOk = catalogChecks.every((c) => c.valid);
  findings.push({
    id: 'catalogs',
    status: catalogsOk ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: catalogChecks.flatMap((c) => c.issues || [])
  });

  // --- Performance: engine + twin composition ---
  const econTimed = timed(() => runEconomicIntelligence({ ...BASE_INPUT }));
  const twinTimed = timed(() =>
    provideFinancialTwinState({
      ...BASE_INPUT,
      economicSnapshot: econTimed.result,
      industrialTwinState: {
        linhas: [{ id: 'line:A', maquinas: [{ id: 'eq:press-01', name: 'Prensa 01', status: 'running' }] }]
      }
    })
  );
  const hubTimed = timed(() => {
    const composed = composeFinanceExecutiveView(BASE_INPUT);
    return applyEconomicIntelligenceToView(composed, econTimed.result);
  });

  const performance_ok =
    econTimed.ms + twinTimed.ms <= FIN_VAL_METRIC_THRESHOLDS.twin_composition_ms_max &&
    hubTimed.ms <= FIN_VAL_METRIC_THRESHOLDS.hub_enrichment_ms_max;

  findings.push({
    id: 'performance',
    status: performance_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: {
      engine_ms: econTimed.ms,
      twin_ms: twinTimed.ms,
      hub_ms: hubTimed.ms,
      twin_total_ms: econTimed.ms + twinTimed.ms,
      limits: {
        twin: FIN_VAL_METRIC_THRESHOLDS.twin_composition_ms_max,
        hub: FIN_VAL_METRIC_THRESHOLDS.hub_enrichment_ms_max
      }
    }
  });

  // --- Consistency: Smart Costing vs industrial day ---
  const industrialDay = BASE_INPUT.costsSummary.operational.per_day;
  const unitCost = econTimed.result.smartCosting?.unitCost?.value;
  const expectedUnit = industrialDay / BASE_INPUT.drivers.units_produced;
  const divergence =
    unitCost != null && expectedUnit !== 0
      ? Math.abs(unitCost - expectedUnit) / Math.abs(expectedUnit)
      : 1;
  // Also check consolidated / losses coherence
  const losses = econTimed.result.performance?.indicators?.economicLosses?.value;
  const cost_divergence_ok =
    divergence <= FIN_VAL_METRIC_THRESHOLDS.cost_divergence_ratio_max &&
    unitCost != null &&
    losses != null &&
    losses >= BASE_INPUT.topLoss.total;

  findings.push({
    id: 'consistency',
    status: cost_divergence_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: { industrialDay, unitCost, expectedUnit, divergence, losses }
  });

  // --- Explainability 100% ---
  const surfaces = [
    econTimed.result.smartCosting?.unitCost,
    econTimed.result.smartCosting?.driverContributions,
    twinTimed.result.overlay?.nodes?.[0],
    twinTimed.result.overlay?.nodes?.[0]?.financial?.operational_risk
  ];
  const explained = surfaces.filter((s) => hasEvidence(s) || (s && s.evidence !== undefined) || (s && s.level));
  // unitCost has evidence; driverContributions has trace; overlay node has evidence
  const explainHits = [
    hasEvidence(econTimed.result.smartCosting?.unitCost),
    hasEvidence(econTimed.result.smartCosting?.driverContributions) ||
      (econTimed.result.smartCosting?.driverContributions?.trace?.length > 0),
    hasEvidence(twinTimed.result.overlay?.nodes?.[0]),
    Boolean(econTimed.result.performance?.indicators?.economicEfficiency?.evidence)
  ];
  const explainabilityCoverage = explainHits.filter(Boolean).length / explainHits.length;
  const explainability_ok =
    explainabilityCoverage >= FIN_VAL_METRIC_THRESHOLDS.explainability_coverage_min;

  findings.push({
    id: 'explainability',
    status: explainability_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: { coverage: explainabilityCoverage, hits: explainHits }
  });

  // --- Observability events ---
  const eventValues = Object.values(FINANCE_EVENTS).filter((v) => String(v).startsWith('finance.'));
  const missingEvents = FIN_VAL_REQUIRED_OBSERVABILITY_EVENTS.filter((e) => !eventValues.includes(e));
  const observability_ok =
    missingEvents.length === 0 &&
    eventValues.length >= FIN_VAL_METRIC_THRESHOLDS.observability_events_min;

  findings.push({
    id: 'observability',
    status: observability_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: { present: eventValues.length, missing: missingEvents }
  });

  // --- Resilience: degraded inputs ---
  let resilience_ok = false;
  try {
    const degraded = provideFinancialTwinState({
      emitEvents: false,
      costsSummary: {},
      byOrigin: [],
      industrialTwinState: null,
      drivers: {}
    });
    resilience_ok =
      degraded.parallelTwin === false &&
      degraded.kind === 'financial_twin_state' &&
      !degraded.persistence;
  } catch (e) {
    resilience_ok = false;
    findings.push({
      id: 'resilience_error',
      status: VALIDATION_STATUS.FAIL,
      detail: e.message
    });
  }
  findings.push({
    id: 'resilience',
    status: resilience_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: { softFail: resilience_ok }
  });

  // --- Twin coherence ---
  const twin = twinTimed.result;
  const twin_ok =
    twin.parallelTwin === false &&
    twin.overlay?.nodes?.length > 0 &&
    twin.financeViewPath?.includes('/app/finance/twin') &&
    twin.industrialTwinDeepLink?.includes('digital-twin');

  findings.push({
    id: 'twin',
    status: twin_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: {
      nodes: twin.overlay?.nodes?.length,
      parallelTwin: twin.parallelTwin
    }
  });

  // --- Journeys: structural coverage (capability chain present) ---
  const hubView = hubTimed.result;
  const journeys_pass =
    FIN_VAL_JOURNEYS.length >= 4 &&
    hubView.kpis?.length >= 6 &&
    hubView.alerts?.length >= 1 &&
    twin_ok &&
    cost_divergence_ok &&
    catalogsOk;

  findings.push({
    id: 'journeys',
    status: journeys_pass ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: {
      journeyCount: FIN_VAL_JOURNEYS.length,
      kpiCount: hubView.kpis?.length,
      alertCount: hubView.alerts?.length
    }
  });

  // --- Exception scenario smoke (EX-FIN-001 spike, EX-FIN-002 leakage, EX-FIN-005 degrade) ---
  const spike = runEconomicIntelligence({
    ...BASE_INPUT,
    costsSummary: {
      operational: { per_day: 5000, per_month: 36000 },
      impact_from_events: { last_day: 150 }
    }
  });
  const spikeVariance = spike.performance?.indicators?.costVariance?.value;
  const exSpikeOk = spikeVariance != null && spikeVariance > 0;

  const exLeakOk = losses > 0 && twin.overlay.nodes.some((n) =>
    ['high', 'medium', 'elevated'].includes(n.financial?.operational_risk?.level)
  );

  const exceptions_ok = exSpikeOk && exLeakOk && resilience_ok;
  findings.push({
    id: 'exceptions',
    status: exceptions_ok ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    detail: {
      scenarios: FIN_VAL_EXCEPTION_SCENARIOS.map((s) => s.id),
      spikeVariance,
      leakRiskOk: exLeakOk
    }
  });

  const metricFlags = {
    journeys_pass: journeys_pass && exceptions_ok,
    cost_divergence_ok,
    performance_ok,
    observability_ok,
    explainability_ok,
    resilience_ok,
    twin_ok
  };

  const gate = evaluateFinEvolve23Gate(metricFlags);
  const allPass = Object.values(metricFlags).every(Boolean);

  return Object.freeze({
    phase: FIN_VAL_001_PHASE,
    principle: FIN_VAL_001_PRINCIPLE,
    scope: FIN_VAL_001_SCOPE,
    status: allPass && gate.openFinEvolve23 ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL,
    metrics: metricFlags,
    findings: Object.freeze(findings),
    gate,
    timings: Object.freeze({
      engine_ms: econTimed.ms,
      twin_ms: twinTimed.ms,
      hub_ms: hubTimed.ms
    }),
    recommendation: gate.openFinEvolve23
      ? 'Abrir FIN-EVOLVE-2.3 (What-if Analysis) — base validada'
      : 'Manter What-if fechado até corrigir critérios FAIL do gate'
  });
}
