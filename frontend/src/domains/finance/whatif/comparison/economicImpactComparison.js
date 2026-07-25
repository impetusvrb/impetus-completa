/**
 * FIN-EVOLVE-2.3 — Economic impact comparison (current vs simulated).
 * Always exposes current, simulated and delta — no result without explainability.
 */
import { FIN_EVOLVE_23_PHASE, FIN_EVOLVE_23_PRINCIPLE } from '../scenario-engine/whatIfConstants.js';

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function deltaOf(current, simulated) {
  if (current == null || simulated == null) return null;
  return Math.round((simulated - current) * 10000) / 10000;
}

function deltaPct(current, simulated) {
  if (current == null || simulated == null || current === 0) return null;
  return Math.round(((simulated - current) / Math.abs(current)) * 10000) / 100;
}

function metric(id, label, current, simulated, unit = 'BRL') {
  return Object.freeze({
    id,
    label,
    unit,
    current,
    simulated,
    delta: deltaOf(current, simulated),
    deltaPct: deltaPct(current, simulated)
  });
}

function lotValuationTotal(economic) {
  const lots = economic?.smartCosting?.lotCosts?.items || economic?.smartCosting?.lotCosts?.lots;
  if (!Array.isArray(lots) || !lots.length) {
    const single = economic?.smartCosting?.lotCosts?.total ?? economic?.smartCosting?.lotCosts?.value;
    return num(single);
  }
  return lots.reduce((acc, row) => acc + (num(row.total ?? row.value ?? row.cost) || 0), 0);
}

/**
 * @param {object} baselineEconomic — runEconomicIntelligence output
 * @param {object} simulatedEconomic
 * @param {object} meta — hypothesesApplied, contracts, scenarioId, limitations
 */
export function compareEconomicImpact(baselineEconomic, simulatedEconomic, meta = {}) {
  const bPerf = baselineEconomic?.performance?.indicators || {};
  const sPerf = simulatedEconomic?.performance?.indicators || {};
  const bUnit = num(baselineEconomic?.smartCosting?.unitCost?.value);
  const sUnit = num(simulatedEconomic?.smartCosting?.unitCost?.value);

  const metrics = Object.freeze([
    metric('total_cost', 'Custo total (dia)', num(bPerf.costReal?.value), num(sPerf.costReal?.value)),
    metric('unit_cost', 'Custo unitário', bUnit, sUnit),
    metric(
      'efficiency',
      'Eficiência económica',
      num(bPerf.economicEfficiency?.value),
      num(sPerf.economicEfficiency?.value),
      '%'
    ),
    metric(
      'losses',
      'Perdas económicas',
      num(bPerf.economicLosses?.value),
      num(sPerf.economicLosses?.value)
    ),
    metric(
      'valuation',
      'Valuation estoque',
      lotValuationTotal(baselineEconomic),
      lotValuationTotal(simulatedEconomic)
    ),
    metric(
      'consolidated',
      'Custo consolidado',
      num(bPerf.consolidatedOperationalCost?.value),
      num(sPerf.consolidatedOperationalCost?.value)
    )
  ]);

  const contractsUsed = Object.freeze([
    ...new Set([
      ...(baselineEconomic?.contractsConsumed || []),
      ...(simulatedEconomic?.contractsConsumed || []),
      ...(meta.contractsUsed || [])
    ])
  ]);

  const limitations = Object.freeze([
    'Composição temporária em memória — não persiste automaticamente',
    'Não altera estado operacional nem Twin industrial',
    'Não é previsão (Release 2.4) nem optimização automática',
    'Drivers/rates hipotéticos podem divergir da telemetria real',
    ...(meta.limitations || [])
  ]);

  const explainability = Object.freeze({
    required: true,
    hypothesesApplied: Object.freeze([...(meta.hypothesesApplied || [])]),
    contractsUsed,
    evidenceConsumed: Object.freeze([
      'EconomicIntelligenceEngine.baseline',
      'EconomicIntelligenceEngine.simulated',
      'FinancialTwinState.baseline (optional)',
      ...(meta.evidenceConsumed || [])
    ]),
    trace: Object.freeze([
      ...(baselineEconomic?.trace || []).map((t) => ({ ...t, lane: 'baseline' })),
      ...(simulatedEconomic?.trace || []).map((t) => ({ ...t, lane: 'simulated' })),
      ...(meta.trace || [])
    ]),
    limitations
  });

  if (!explainability.hypothesesApplied.length && !meta.allowEmptyHypotheses) {
    // still valid comparison of identical states — mark limitation
  }

  return Object.freeze({
    kind: 'economic_impact_comparison',
    phase: FIN_EVOLVE_23_PHASE,
    principle: FIN_EVOLVE_23_PRINCIPLE,
    scenarioId: meta.scenarioId || null,
    metrics,
    explainability,
    mutatesOperational: false,
    persistence: false
  });
}

export function validateEconomicImpactComparison(comparison) {
  const issues = [];
  if (!comparison || comparison.kind !== 'economic_impact_comparison') {
    issues.push('missing comparison');
  }
  if (!comparison?.metrics?.length) issues.push('missing metrics');
  if (!comparison?.explainability) issues.push('missing explainability');
  if (comparison?.explainability && !comparison.explainability.limitations?.length) {
    issues.push('missing limitations');
  }
  if (comparison?.mutatesOperational) issues.push('comparison must not mutate operational');
  return { valid: issues.length === 0, issues };
}
