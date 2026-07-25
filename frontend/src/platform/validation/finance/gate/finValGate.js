/**
 * FIN-VAL-001 — Formal gate to open FIN-EVOLVE-2.3 (What-if).
 * VALIDATE BEFORE EXPAND — product capabilities stay closed until PASS.
 */
import { FIN_VAL_001_PHASE, FIN_VAL_001_PRINCIPLE } from '../finVal001Constants.js';
import { FIN_VAL_METRIC_THRESHOLDS } from '../metrics/finValMetrics.js';

export const FIN_EVOLVE_23_GATE_ID = 'GATE-FIN-EVOLVE-2.3';

export const FIN_VAL_GATE_CRITERIA = Object.freeze([
  Object.freeze({
    id: 'G-FIN-001',
    label: 'Todos os fluxos executivos validados',
    metric: 'journeys_pass',
    required: true
  }),
  Object.freeze({
    id: 'G-FIN-002',
    label: 'Nenhuma divergência crítica custos ↔ Smart Costing',
    metric: 'cost_divergence_ok',
    required: true
  }),
  Object.freeze({
    id: 'G-FIN-003',
    label: 'Desempenho dentro dos limites',
    metric: 'performance_ok',
    required: true
  }),
  Object.freeze({
    id: 'G-FIN-004',
    label: 'Observabilidade completa (eventos finance.*)',
    metric: 'observability_ok',
    required: true
  }),
  Object.freeze({
    id: 'G-FIN-005',
    label: 'Explicabilidade em 100% dos cálculos económicos',
    metric: 'explainability_ok',
    required: true
  }),
  Object.freeze({
    id: 'G-FIN-006',
    label: 'Resiliência sob degradação controlada',
    metric: 'resilience_ok',
    required: true
  }),
  Object.freeze({
    id: 'G-FIN-007',
    label: 'Twin financeiro coerente (sem Twin paralelo)',
    metric: 'twin_ok',
    required: true
  })
]);

/**
 * Evaluate gate from harness report metrics object.
 * @param {object} results — boolean flags from runFinanceOperationalValidation
 */
export function evaluateFinEvolve23Gate(results = {}) {
  const checks = FIN_VAL_GATE_CRITERIA.map((c) => {
    const pass = results[c.metric] === true;
    return Object.freeze({
      ...c,
      status: pass ? 'PASS' : 'FAIL',
      pass
    });
  });
  const failed = checks.filter((c) => c.required && !c.pass);
  const openWhatIf = failed.length === 0;

  return Object.freeze({
    gateId: FIN_EVOLVE_23_GATE_ID,
    phase: FIN_VAL_001_PHASE,
    principle: FIN_VAL_001_PRINCIPLE,
    openFinEvolve23: openWhatIf,
    openWhatIf,
    openPrediction: false,
    checks,
    failed: failed.map((c) => c.id),
    thresholds: FIN_VAL_METRIC_THRESHOLDS,
    verdict: openWhatIf
      ? 'PASS — FIN-EVOLVE-2.3 (What-if) may be opened'
      : `HOLD — failed: ${failed.map((c) => c.id).join(', ') || 'unknown'}`
  });
}

export function validateFinValGateCatalog() {
  const issues = [];
  if (FIN_VAL_GATE_CRITERIA.length < 7) issues.push('gate criteria incomplete');
  const ids = new Set();
  for (const c of FIN_VAL_GATE_CRITERIA) {
    if (ids.has(c.id)) issues.push(`duplicate ${c.id}`);
    ids.add(c.id);
    if (!c.metric || !c.required) issues.push(`${c.id} incomplete`);
  }
  return { valid: issues.length === 0, issues };
}
