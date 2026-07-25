/**
 * FIN-VAL-001 — Quality metrics & thresholds for Finance validation gate.
 */
export const FIN_VAL_METRIC_CATEGORIES = Object.freeze({
  PERFORMANCE: 'performance',
  CONSISTENCY: 'consistency',
  EXPLAINABILITY: 'explainability',
  OBSERVABILITY: 'observability',
  RESILIENCE: 'resilience'
});

export const FIN_VAL_METRIC_THRESHOLDS = Object.freeze({
  /** Composition of Economic Intelligence + Twin state (ms, sync harness) */
  twin_composition_ms_max: 250,
  hub_enrichment_ms_max: 250,
  /** |smart_total - industrial_day| / industrial_day — loose because drivers may partial-resolve */
  cost_divergence_ratio_max: 2.5,
  /** Every economic calculation surface must expose evidence/trace */
  explainability_coverage_min: 1.0,
  /** Required finance.* event constants present */
  observability_events_min: 12,
  /** Degraded input must not throw and must keep parallelTwin false */
  resilience_soft_fail_required: true
});

export const FIN_VAL_REQUIRED_OBSERVABILITY_EVENTS = Object.freeze([
  'finance.dashboard.loaded',
  'finance.kpi.opened',
  'finance.alert.opened',
  'finance.insight.clicked',
  'finance.decision.executed',
  'finance.smart_costing.calculated',
  'finance.performance.updated',
  'finance.cost_analysis.completed',
  'finance.twin.opened',
  'finance.twin.overlay.loaded',
  'finance.twin.node.selected',
  'finance.twin.financial_state.updated'
]);

export function validateFinValMetricsCatalog() {
  const issues = [];
  for (const k of Object.keys(FIN_VAL_METRIC_THRESHOLDS)) {
    if (FIN_VAL_METRIC_THRESHOLDS[k] == null) issues.push(`threshold ${k} missing`);
  }
  if (FIN_VAL_REQUIRED_OBSERVABILITY_EVENTS.length < 12) {
    issues.push('observability catalog incomplete');
  }
  return { valid: issues.length === 0, issues };
}
