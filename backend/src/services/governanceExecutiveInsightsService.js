'use strict';

/**
 * EVENT-GOVERNANCE-18 — Executive Governance Insights.
 * Consolida inteligência existente em indicadores estratégicos — nunca altera o motor.
 */

const observability = require('./observabilityService');
const { buildGovernanceExecutiveInsightsDto } = require('../governance/governanceExecutiveInsightsDto');

const METRIC_REPORTS = 'event_governance_executive_reports_generated';
const METRIC_DASHBOARD = 'event_governance_executive_dashboard_requests';
const METRIC_KPIS = 'event_governance_executive_kpis_calculated';
const METRIC_SUMMARY = 'event_governance_executive_summary_generated';
const METRIC_ERRORS = 'event_governance_executive_errors';

const MAX_HISTORY = Math.max(
  50,
  parseInt(String(process.env.GOVERNANCE_EXECUTIVE_MAX_HISTORY || '100'), 10) || 100
);

/** @type {object[]} */
const _reportHistory = [];
/** @type {{ reports: number, dashboardRequests: number, errors: number, lastReportAt: string|null }} */
const _stats = { reports: 0, dashboardRequests: 0, errors: 0, lastReportAt: null };

function isExecutiveInsightsEnabled() {
  return String(process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
}

function _avg(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 1000) / 1000;
}

function _safeRequire(relPath) {
  try {
    return require(relPath);
  } catch {
    return null;
  }
}

function _collectSnapshots(companyId) {
  const intelligence = _safeRequire('./governanceIntelligenceService');
  if (intelligence && typeof intelligence.getSnapshots === 'function') {
    return intelligence.getSnapshots(companyId);
  }
  return [];
}

function _collectImprovementReport(companyId) {
  const intelligence = _safeRequire('./governanceIntelligenceService');
  if (intelligence && typeof intelligence.buildImprovementReport === 'function') {
    return intelligence.buildImprovementReport(companyId);
  }
  return null;
}

function _collectOptimizationReport(companyId) {
  const policyOpt = _safeRequire('./governancePolicyOptimizationService');
  if (policyOpt && typeof policyOpt.buildOptimizationReport === 'function') {
    return policyOpt.buildOptimizationReport(companyId);
  }
  return null;
}

function _collectLearningStatus() {
  const learning = _safeRequire('./governanceLearningService');
  return learning && typeof learning.getAuditStatus === 'function' ? learning.getAuditStatus() : {};
}

function _collectMemoryStats(companyId) {
  const memory = _safeRequire('./governanceOperationalMemoryService');
  if (!memory) return { entries: 0, patterns: 0 };
  const global = typeof memory.getMemoryStats === 'function' ? memory.getMemoryStats() : {};
  const entries =
    companyId && typeof memory.getEntries === 'function' ? memory.getEntries(companyId).length : 0;
  return { ...global, companyEntries: entries };
}

function _collectExplainabilityStatus() {
  const explainability = _safeRequire('./governanceExplainabilityService');
  return explainability && typeof explainability.getAuditStatus === 'function'
    ? explainability.getAuditStatus()
    : {};
}

/**
 * Indicadores estratégicos consolidados (determinísticos).
 * @param {string} [companyId]
 */
function consolidateStrategicIndicators(companyId) {
  const snapshots = _collectSnapshots(companyId);
  const improvement = _collectImprovementReport(companyId);
  const optimization = _collectOptimizationReport(companyId);
  const learning = _collectLearningStatus();
  const memory = _collectMemoryStats(companyId);
  const explainability = _collectExplainabilityStatus();
  const metrics = observability.getMetricsSnapshot();
  const analytics = improvement?.analytics || {};

  const withConfidence = snapshots.filter((s) => Number.isFinite(s.confidence));
  const withMemory = snapshots.filter((s) => Number.isFinite(s.memoryScore));
  const withExplain = snapshots.filter((s) => Number.isFinite(s.explainabilityScore));

  const eventVolume = snapshots.length || metrics.event_governance_evaluations || 0;
  const resolutionRate = analytics.decisionStability ?? null;
  const successes = snapshots.filter((s) => s.success).length;
  const computedResolution =
    snapshots.length > 0 ? Math.round((successes / snapshots.length) * 1000) / 1000 : resolutionRate;

  return Object.freeze({
    eventVolume,
    severityDistribution: Object.freeze({ ...(analytics.severityDistribution || {}) }),
    policyDistribution: Object.freeze({ ...(analytics.policyDistribution || {}) }),
    resolutionRate: computedResolution,
    recurrenceRate: analytics.recurrenceRate ?? null,
    falsePositiveRate: analytics.falsePositiveRate ?? null,
    operationalStability: analytics.decisionStability ?? computedResolution,
    averageResolutionTimeMs: analytics.averageResolutionTimeMs ?? null,
    confidence: {
      average: _avg(withConfidence.map((s) => s.confidence)),
      trend: analytics.confidenceTrend ?? null
    },
    memoryScore: {
      average: _avg(withMemory.map((s) => s.memoryScore)),
      trend: analytics.memoryScoreTrend ?? null,
      entriesBuffered: memory.entries_buffered ?? memory.companyEntries ?? 0
    },
    explainabilityScore: {
      average:
        _avg(withExplain.map((s) => s.explainabilityScore)) ??
        (explainability.explainability_avg_score != null
          ? Math.round(explainability.explainability_avg_score * 1000) / 1000
          : null),
      trend: analytics.explainabilityScoreTrend ?? null
    },
    governanceHealthScore: improvement?.governanceHealthScore ?? null,
    policyEffectivenessScore: optimization?.averagePolicyEffectivenessScore ?? null,
    learning: Object.freeze({
      events: learning.learning_events ?? metrics.event_governance_learning_events ?? 0,
      success: learning.learning_success ?? metrics.event_governance_learning_success ?? 0,
      falsePositive: learning.learning_false_positive ?? metrics.event_governance_learning_false_positive ?? 0
    }),
    sampleSize: analytics.sampleSize ?? snapshots.length
  });
}

/**
 * KPIs executivos derivados dos indicadores existentes.
 * @param {string} [companyId]
 */
function computeExecutiveKpis(companyId) {
  const indicators = consolidateStrategicIndicators(companyId);
  const improvement = _collectImprovementReport(companyId);
  const optimization = _collectOptimizationReport(companyId);
  const analytics = improvement?.analytics || {};
  const trends = improvement?.trends || [];

  const governanceMaturityIndex = _clamp01(
    _avg([
      indicators.governanceHealthScore ?? 0.5,
      indicators.confidence.average ?? 0.5,
      indicators.memoryScore.average ?? 0.5,
      indicators.explainabilityScore.average ?? 0.5
    ])
  );

  let operationalStabilityIndex = 0.5;
  if (indicators.operationalStability != null) {
    operationalStabilityIndex = indicators.operationalStability * 0.55 + 0.45 * operationalStabilityIndex;
  }
  if (indicators.falsePositiveRate != null) {
    operationalStabilityIndex -= indicators.falsePositiveRate * 0.25;
  }
  if (indicators.recurrenceRate != null) {
    operationalStabilityIndex -= indicators.recurrenceRate * 0.2;
  }
  operationalStabilityIndex = _clamp01(operationalStabilityIndex);

  const conflictCount = optimization?.conflicts?.length || 0;
  const redundancyCount = optimization?.redundancies?.length || 0;
  const policyEfficiencyIndex = _clamp01(
    (indicators.policyEffectivenessScore ?? 0.5) - Math.min(0.25, conflictCount * 0.02 + redundancyCount * 0.01)
  );

  let continuousImprovementIndex = 0.5;
  if (analytics.confidenceTrend != null && analytics.confidenceTrend > 0) continuousImprovementIndex += 0.1;
  if (analytics.confidenceTrend != null && analytics.confidenceTrend < 0) continuousImprovementIndex -= 0.1;
  if (analytics.memoryScoreTrend != null && analytics.memoryScoreTrend > 0) continuousImprovementIndex += 0.05;
  if (analytics.explainabilityScoreTrend != null && analytics.explainabilityScoreTrend > 0) {
    continuousImprovementIndex += 0.05;
  }
  const learningEvents = indicators.learning.events || 1;
  const learningSuccessRate = (indicators.learning.success || 0) / Math.max(learningEvents, 1);
  if (learningSuccessRate > 0.7) continuousImprovementIndex += 0.08;
  continuousImprovementIndex = _clamp01(continuousImprovementIndex);

  const ups = trends.filter((t) => t.direction === 'up').length;
  const downs = trends.filter((t) => t.direction === 'down').length;
  const governanceEvolutionTrend = ups > downs ? 'improving' : downs > ups ? 'declining' : 'stable';

  _metric(METRIC_KPIS);

  return Object.freeze({
    governanceMaturityIndex,
    operationalStabilityIndex,
    policyEfficiencyIndex,
    continuousImprovementIndex,
    governanceEvolutionTrend
  });
}

/**
 * Identifica riscos estruturados a partir de dados consolidados.
 * @param {string} [companyId]
 */
function identifyExecutiveRisks(companyId) {
  const indicators = consolidateStrategicIndicators(companyId);
  const improvement = _collectImprovementReport(companyId);
  const optimization = _collectOptimizationReport(companyId);
  const risks = [];

  if (indicators.falsePositiveRate != null && indicators.falsePositiveRate > 0.25) {
    risks.push({
      id: 'risk_false_positive_elevated',
      severity: 'medium',
      category: 'quality',
      message: `Taxa de falsos positivos elevada (${Math.round(indicators.falsePositiveRate * 100)}%).`,
      evidence: { falsePositiveRate: indicators.falsePositiveRate }
    });
  }

  if (indicators.recurrenceRate != null && indicators.recurrenceRate > 0.3) {
    risks.push({
      id: 'risk_recurrence_persistent',
      severity: 'medium',
      category: 'operational',
      message: `Reincidência persistente (${Math.round(indicators.recurrenceRate * 100)}%).`,
      evidence: { recurrenceRate: indicators.recurrenceRate }
    });
  }

  if (indicators.governanceHealthScore != null && indicators.governanceHealthScore < 0.5) {
    risks.push({
      id: 'risk_governance_health_low',
      severity: 'high',
      category: 'governance',
      message: `Governance health score abaixo do limiar (${indicators.governanceHealthScore}).`,
      evidence: { governanceHealthScore: indicators.governanceHealthScore }
    });
  }

  if ((optimization?.conflicts?.length || 0) > 0) {
    risks.push({
      id: 'risk_policy_conflicts',
      severity: 'medium',
      category: 'policy',
      message: `${optimization.conflicts.length} conflito(s) potencial(is) entre políticas.`,
      evidence: { conflictCount: optimization.conflicts.length }
    });
  }

  for (const rec of improvement?.recommendations || []) {
    if (rec.severity === 'high') {
      risks.push({
        id: `risk_intel_${rec.id}`,
        severity: 'high',
        category: 'intelligence',
        message: rec.message,
        evidence: rec.evidence || {}
      });
    }
  }

  return risks;
}

/**
 * Consolida recomendações de intelligence + policy optimization.
 * @param {string} [companyId]
 */
function consolidateRecommendations(companyId) {
  const improvement = _collectImprovementReport(companyId);
  const optimization = _collectOptimizationReport(companyId);

  const intelRecs = (improvement?.recommendations || []).map((r) => ({
    ...r,
    source: 'intelligence',
    actionable: false
  }));

  const optRecs = (optimization?.recommendations || []).map((r) => ({
    ...r,
    source: 'policy_optimization',
    actionable: false
  }));

  const seen = new Set();
  const merged = [];
  for (const rec of [...intelRecs, ...optRecs]) {
    const key = rec.id || `${rec.type}_${rec.policyId || ''}_${rec.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(Object.freeze({ ...rec, actionable: false }));
  }

  return merged;
}

/**
 * Resumo executivo estruturado (sem IA generativa).
 * @param {string} [companyId]
 */
function buildExecutiveSummary(companyId) {
  const indicators = consolidateStrategicIndicators(companyId);
  const kpis = computeExecutiveKpis(companyId);
  const improvement = _collectImprovementReport(companyId);
  const trends = improvement?.trends || [];
  const risks = identifyExecutiveRisks(companyId);
  const recommendations = consolidateRecommendations(companyId);

  const headline =
    kpis.governanceEvolutionTrend === 'improving'
      ? 'Governança em evolução positiva — indicadores estratégicos estáveis ou em melhoria.'
      : kpis.governanceEvolutionTrend === 'declining'
        ? 'Governança com sinais de degradação — revisão executiva recomendada.'
        : 'Governança operacional estável — monitorização contínua activa.';

  _metric(METRIC_SUMMARY);

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    companyId: companyId || null,
    headline,
    mainIndicators: Object.freeze({
      eventVolume: indicators.eventVolume,
      resolutionRate: indicators.resolutionRate,
      governanceHealthScore: indicators.governanceHealthScore,
      policyEffectivenessScore: indicators.policyEffectivenessScore,
      governanceMaturityIndex: kpis.governanceMaturityIndex,
      operationalStabilityIndex: kpis.operationalStabilityIndex
    }),
    trends: Object.freeze(trends.map((t) => Object.freeze({ ...t }))),
    risks: Object.freeze(risks.map((r) => Object.freeze({ ...r }))),
    recommendations: Object.freeze(recommendations),
    historicalEvolution: Object.freeze({
      reportsGenerated: _stats.reports,
      lastReportAt: _stats.lastReportAt,
      snapshotsAnalyzed: indicators.sampleSize,
      governanceEvolutionTrend: kpis.governanceEvolutionTrend
    })
  });
}

/**
 * DTO interno para dashboards executivos.
 * @param {string} [companyId]
 */
function buildExecutiveDashboard(companyId) {
  _stats.dashboardRequests += 1;
  _metric(METRIC_DASHBOARD);

  const indicators = consolidateStrategicIndicators(companyId);
  const kpis = computeExecutiveKpis(companyId);
  const summary = buildExecutiveSummary(companyId);
  const improvement = _collectImprovementReport(companyId);

  return buildGovernanceExecutiveInsightsDto({
    companyId: companyId || null,
    headline: summary.headline,
    kpis,
    indicators,
    trends: improvement?.trends || [],
    risks: summary.risks,
    recommendations: summary.recommendations,
    evolution: summary.historicalEvolution
  });
}

/**
 * Relatório executivo completo.
 * @param {string} [companyId]
 */
function generateExecutiveReport(companyId) {
  if (!isExecutiveInsightsEnabled()) {
    return { mode: 'shadow', skipped: true };
  }

  try {
    const dashboard = buildExecutiveDashboard(companyId);
    const summary = buildExecutiveSummary(companyId);
    const kpis = computeExecutiveKpis(companyId);
    const indicators = consolidateStrategicIndicators(companyId);

    const report = Object.freeze({
      generatedAt: new Date().toISOString(),
      companyId: companyId || null,
      kpis,
      indicators,
      trends: dashboard.trends,
      evolution: summary.historicalEvolution,
      executiveSummary: summary,
      dashboard
    });

    _stats.reports += 1;
    _stats.lastReportAt = report.generatedAt;
    _metric(METRIC_REPORTS);

    _reportHistory.push({
      generatedAt: report.generatedAt,
      companyId: companyId || null,
      governanceMaturityIndex: kpis.governanceMaturityIndex,
      governanceEvolutionTrend: kpis.governanceEvolutionTrend
    });
    while (_reportHistory.length > MAX_HISTORY) _reportHistory.shift();

    return { mode: 'executive', report };
  } catch (err) {
    _stats.errors += 1;
    _metric(METRIC_ERRORS);
    console.warn('[governanceExecutiveInsightsService][generate]', err?.message ?? err);
    return { mode: 'error', error: err?.message };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const kpis = isExecutiveInsightsEnabled() ? computeExecutiveKpis() : null;

  return {
    enabled: isExecutiveInsightsEnabled(),
    executive_reports_generated: _stats.reports || metrics[METRIC_REPORTS] || 0,
    executive_dashboard_requests: _stats.dashboardRequests || metrics[METRIC_DASHBOARD] || 0,
    executive_kpis_calculated: metrics[METRIC_KPIS] || 0,
    executive_summary_generated: metrics[METRIC_SUMMARY] || 0,
    executive_errors: _stats.errors || metrics[METRIC_ERRORS] || 0,
    last_report_at: _stats.lastReportAt,
    report_history: _reportHistory.slice(-10),
    executive_kpis: kpis
  };
}

function resetForTests() {
  _reportHistory.length = 0;
  _stats.reports = 0;
  _stats.dashboardRequests = 0;
  _stats.errors = 0;
  _stats.lastReportAt = null;
}

module.exports = {
  isExecutiveInsightsEnabled,
  consolidateStrategicIndicators,
  computeExecutiveKpis,
  identifyExecutiveRisks,
  consolidateRecommendations,
  buildExecutiveSummary,
  buildExecutiveDashboard,
  generateExecutiveReport,
  getAuditStatus,
  resetForTests,
  METRIC_REPORTS,
  METRIC_DASHBOARD,
  METRIC_KPIS,
  METRIC_SUMMARY,
  METRIC_ERRORS
};
