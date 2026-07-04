'use strict';

/**
 * ECO-07 — Executive Insights Consumer Adapter (ADR-ECO-003).
 * Dashboards executivos consomem KPIs certificados EG — nunca recalculam.
 */

const observability = require('../observabilityService');
const ecoExecutiveFlags = require('../ecoExecutiveFlags');

const METRIC_EVENTS = 'eco_executive_consumer_events';

const CERTIFIED_KPI_KEYS = Object.freeze([
  'governanceMaturityIndex',
  'operationalStabilityIndex',
  'policyEfficiencyIndex',
  'continuousImprovementIndex',
  'governanceEvolutionTrend'
]);

/** @type {{ events: number, dashboards: Set<string> }} */
const _stats = { events: 0, dashboards: new Set() };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _safeRequire(relPath) {
  try {
    return require(relPath);
  } catch {
    return null;
  }
}

function _clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
}

/**
 * KPIs paralelos inferidos dos dashboards legados (pré-ECO-07).
 * @param {object} context
 */
function inferParallelExecutiveKpis(context = {}) {
  const base = context.baseDashboard || {};
  const exec = context.executiveDashboard || {};
  const strategic = context.strategic || exec.strategic || {};
  const ga = exec.governance_analytics || context.governanceAnalytics || {};

  const pulseIndex = base.company_pulse?.pulse_index;
  const pulseProxy = pulseIndex != null ? _clamp01(pulseIndex / 100) : null;
  const humanConfidence = exec.domain_states?.human?.confidence ?? base.company_pulse?.confidence;
  const opHealth = exec.domain_states?.operational?.proxy_health;

  let operationalStabilityIndex = opHealth === 'active' ? 0.72 : opHealth === 'low_signal' ? 0.48 : 0.55;
  if (ga.governanceHealthScore != null) {
    operationalStabilityIndex = ga.governanceHealthScore;
  }

  const maturityFromStrategic =
    strategic.maturity?.maturity_index != null ? _clamp01(strategic.maturity.maturity_index / 100) : null;

  return Object.freeze({
    source: 'executive_dashboard_parallel',
    recalculated: true,
    dashboardId: context.dashboardId || 'unknown',
    kpis: Object.freeze({
      governanceMaturityIndex:
        ga.governanceHealthScore ?? maturityFromStrategic ?? pulseProxy ?? _clamp01(humanConfidence),
      operationalStabilityIndex: ga.memoryScore ?? operationalStabilityIndex,
      policyEfficiencyIndex: ga.policyEffectivenessScore ?? null,
      continuousImprovementIndex: ga.confidence ?? _clamp01(humanConfidence),
      governanceEvolutionTrend: null
    })
  });
}

/**
 * Consome KPIs certificados do Executive Insights (read-only — não altera EG-18).
 * @param {string} companyId
 */
function consumeExecutiveInsights(companyId) {
  const executiveInsights = _safeRequire('../governanceExecutiveInsightsService');
  if (
    !executiveInsights ||
    typeof executiveInsights.isExecutiveInsightsEnabled !== 'function' ||
    !executiveInsights.isExecutiveInsightsEnabled()
  ) {
    return { skipped: true, reason: 'executive_insights_disabled' };
  }

  const dashboard =
    typeof executiveInsights.buildExecutiveDashboard === 'function'
      ? executiveInsights.buildExecutiveDashboard(companyId)
      : null;

  if (!dashboard?.kpis) {
    return { skipped: true, reason: 'executive_dashboard_unavailable' };
  }

  return Object.freeze({
    source: 'event_governance',
    recalculated: false,
    consumedAt: new Date().toISOString(),
    kpis: Object.freeze({ ...dashboard.kpis }),
    indicators: dashboard.indicators ? Object.freeze({ ...dashboard.indicators }) : null,
    headline: dashboard.executiveSummary?.headline ?? null,
    trends: dashboard.trends || [],
    risks: dashboard.risks || [],
    recommendations: dashboard.recommendations || [],
    evolution: dashboard.evolution || dashboard.executiveSummary?.evolution || null
  });
}

function _scoresComparable(a, b, tolerance = 0.15) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a) === String(b);
  }
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

/**
 * Compara KPIs paralelos vs Executive Insights (shadow).
 * @param {object} parallel
 * @param {object} governance
 */
function compareShadow(parallel, governance) {
  const localKpis = parallel.kpis || {};
  const govKpis = governance.kpis || {};

  const comparisons = {};
  let numericMatches = 0;
  let numericTotal = 0;

  for (const key of CERTIFIED_KPI_KEYS) {
    if (key === 'governanceEvolutionTrend') {
      comparisons[key] = {
        local: localKpis[key],
        governance: govKpis[key],
        match: localKpis[key] == null || _scoresComparable(localKpis[key], govKpis[key], 0)
      };
      continue;
    }
    numericTotal += 1;
    const match = _scoresComparable(localKpis[key], govKpis[key]);
    if (match) numericMatches += 1;
    comparisons[key] = {
      local: localKpis[key],
      governance: govKpis[key],
      match
    };
  }

  const match = numericTotal === 0 ? true : numericMatches / numericTotal >= 0.6;

  return {
    match,
    overlap: numericTotal ? numericMatches / numericTotal : 1,
    comparisons,
    parallel: { kpis: localKpis },
    governance: { kpis: govKpis },
    divergence: match
      ? null
      : {
          belowThreshold: numericMatches / Math.max(numericTotal, 1) < 0.6,
          mismatched: Object.entries(comparisons)
            .filter(([, v]) => v.match === false)
            .map(([k]) => k)
        }
  };
}

/**
 * Preserva dados locais não-EG do dashboard.
 * @param {object} context
 */
function extractOwnPreserved(context = {}) {
  const exec = context.executiveDashboard || {};
  return Object.freeze({
    domain_states: exec.domain_states,
    cross_domain_insights: exec.cross_domain_insights,
    temporal_learning: exec.temporal_learning,
    framework: exec.framework,
    strategic: context.strategic || exec.strategic || null
  });
}

/**
 * Processa convergência Executive Insights para dashboard executivo.
 * @param {string} companyId
 * @param {object} context — { baseDashboard, executiveDashboard, dashboardId, strategic }
 */
async function processExecutiveDashboard(companyId, context = {}) {
  const started = Date.now();
  if (!companyId) {
    return { skipped: true, reason: 'missing_company_id' };
  }

  _stats.events += 1;
  _metric(METRIC_EVENTS);

  const dashboardId = context.dashboardId || 'executive_dashboard';
  if (dashboardId) _stats.dashboards.add(dashboardId);

  const consumerMode = ecoExecutiveFlags.isEcoExecutiveViaEg();
  const parallel = inferParallelExecutiveKpis({ ...context, dashboardId });
  const governance = consumeExecutiveInsights(companyId);

  if (governance.skipped) {
    ecoExecutiveFlags.recordObservation({
      mode: consumerMode ? 'consumer' : 'shadow',
      durationMs: Date.now() - started,
      localKpis: true,
      dashboardId
    });
    return {
      mode: consumerMode ? 'consumer' : 'shadow',
      skipped: true,
      reason: governance.reason,
      parallel
    };
  }

  if (!consumerMode) {
    const comparison = compareShadow(parallel, governance);
    ecoExecutiveFlags.recordObservation({
      mode: 'shadow',
      durationMs: Date.now() - started,
      localKpis: true,
      governanceKpis: true,
      match: comparison.match,
      dashboardId
    });

    return {
      mode: 'shadow',
      comparison,
      parallel,
      governanceInsights: governance,
      dashboardId,
      ownPreserved: extractOwnPreserved(context)
    };
  }

  const kpiCount = CERTIFIED_KPI_KEYS.filter((k) => governance.kpis[k] != null).length;

  ecoExecutiveFlags.recordObservation({
    mode: 'consumer',
    durationMs: Date.now() - started,
    reused: kpiCount > 0,
    kpiCount,
    dashboardId
  });

  return {
    mode: 'consumer',
    executiveKpis: governance.kpis,
    executiveInsights: governance,
    insights_source: 'event_governance',
    dashboardId,
    ownPreserved: extractOwnPreserved(context),
    no_parallel_kpi_calculation: true
  };
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    adapter: 'executiveInsightsConsumerAdapter',
    adr: 'ADR-ECO-003',
    events_evaluated: _stats.events || metrics[METRIC_EVENTS] || 0,
    certified_kpis: CERTIFIED_KPI_KEYS,
    dashboards_observed: [..._stats.dashboards],
    flag: ecoExecutiveFlags.getAuditStatus()
  };
}

function resetStatsForTests() {
  _stats.events = 0;
  _stats.dashboards = new Set();
}

module.exports = {
  CERTIFIED_KPI_KEYS,
  inferParallelExecutiveKpis,
  consumeExecutiveInsights,
  compareShadow,
  extractOwnPreserved,
  processExecutiveDashboard,
  getAuditStatus,
  resetStatsForTests
};
