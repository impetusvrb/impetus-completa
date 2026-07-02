'use strict';

/**
 * EVENT-GOVERNANCE-16 — Inteligência de Governança & Melhoria Contínua.
 * Observacional e consultivo — nunca altera decisões, políticas ou scores.
 */

const observability = require('./observabilityService');

const METRIC_RUNS = 'event_governance_intelligence_runs';
const METRIC_RECOMMENDATIONS = 'event_governance_recommendations_generated';
const METRIC_HEALTH_SCORE = 'event_governance_health_score';
const METRIC_TREND_DETECTIONS = 'event_governance_trend_detections';
const METRIC_ERRORS = 'event_governance_intelligence_errors';

const MAX_SNAPSHOTS = Math.max(
  100,
  parseInt(String(process.env.GOVERNANCE_INTELLIGENCE_MAX_SNAPSHOTS || '500'), 10) || 500
);

/** @type {object[]} */
const _snapshots = [];
/** @type {object[]} */
const _recommendations = [];
/** @type {{ runs: number, errors: number, lastHealthScore: number, lastReportAt: string|null }} */
const _stats = { runs: 0, errors: 0, lastHealthScore: 0.5, lastReportAt: null };

function isIntelligenceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_INTELLIGENCE || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

/**
 * Regista snapshot passivo pós-pipeline (não altera comportamento).
 * @param {object} event
 * @param {object} governanceResult
 */
function recordPipelineSnapshot(event, governanceResult) {
  if (!isIntelligenceEnabled() || !event?.companyId) {
    return { recorded: false };
  }

  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const execResult = governanceResult?.execResult || {};
  const memory = evaluation.decisionContext?.memory || null;
  const explainability = governanceResult?.explainability || null;

  const snapshot = Object.freeze({
    companyId: event.companyId,
    eventId: decision.eventId || event.eventId,
    eventType: event.eventType,
    category: event.category || decision.category,
    policyId: decision.policyId || evaluation.policyId || 'UNMATCHED',
    severity: decision.severity || event.severity,
    approved: evaluation.approved === true,
    success: execResult.success === true,
    confidence: decision.confidence ?? null,
    memoryScore: memory?.memoryScore ?? null,
    explainabilityScore: explainability?.explainabilityScore ?? null,
    recurrenceRate: memory?.recurrenceRate ?? null,
    falsePositiveHint: execResult.success === false && (decision.severity === 'low' || decision.severity === 'medium'),
    resolutionLatencyMs: execResult.latencyMs ?? null,
    timestamp: new Date().toISOString()
  });

  _snapshots.push(snapshot);
  while (_snapshots.length > MAX_SNAPSHOTS) _snapshots.shift();

  return { recorded: true, snapshot };
}

function _filterSnapshots(companyId) {
  if (!companyId) return [..._snapshots];
  return _snapshots.filter((s) => String(s.companyId) === String(companyId));
}

/**
 * Health analytics determinísticos.
 * @param {string} [companyId]
 */
function computeHealthAnalytics(companyId) {
  const snapshots = _filterSnapshots(companyId);
  const metrics = observability.getMetricsSnapshot();

  if (!snapshots.length) {
    return {
      sampleSize: 0,
      decisionStability: null,
      falsePositiveRate: null,
      recurrenceRate: null,
      confidenceTrend: null,
      memoryScoreTrend: null,
      explainabilityScoreTrend: null,
      averageResolutionTimeMs: null,
      severityDistribution: {},
      policyDistribution: {},
      observability: {
        learning_false_positive: metrics.event_governance_learning_false_positive || 0,
        memory_hits: metrics.event_governance_memory_hits || 0,
        explainability_generated: metrics.event_governance_explainability_generated || 0
      }
    };
  }

  const n = snapshots.length;
  const successes = snapshots.filter((s) => s.success).length;
  const falsePos = snapshots.filter((s) => s.falsePositiveHint).length;
  const withRecurrence = snapshots.filter((s) => s.recurrenceRate != null && s.recurrenceRate > 0);
  const withLatency = snapshots.filter((s) => s.resolutionLatencyMs != null);

  const severityDistribution = {};
  const policyDistribution = {};
  for (const s of snapshots) {
    severityDistribution[s.severity] = (severityDistribution[s.severity] || 0) + 1;
    policyDistribution[s.policyId] = (policyDistribution[s.policyId] || 0) + 1;
  }

  const half = Math.floor(n / 2) || 1;
  const firstHalf = snapshots.slice(0, half);
  const secondHalf = snapshots.slice(half);

  const avg = (arr, key) => {
    const vals = arr.map((s) => s[key]).filter((v) => Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const trend = (first, second, key) => {
    const a = avg(first, key);
    const b = avg(second, key);
    if (a == null || b == null) return null;
    return Math.round((b - a) * 1000) / 1000;
  };

  return {
    sampleSize: n,
    decisionStability: Math.round((successes / n) * 1000) / 1000,
    falsePositiveRate: Math.round((falsePos / n) * 1000) / 1000,
    recurrenceRate: withRecurrence.length
      ? Math.round(
          (withRecurrence.reduce((s, x) => s + (x.recurrenceRate || 0), 0) / withRecurrence.length) * 1000
        ) / 1000
      : 0,
    confidenceTrend: trend(firstHalf, secondHalf, 'confidence'),
    memoryScoreTrend: trend(firstHalf, secondHalf, 'memoryScore'),
    explainabilityScoreTrend: trend(firstHalf, secondHalf, 'explainabilityScore'),
    averageResolutionTimeMs: withLatency.length
      ? Math.round(withLatency.reduce((s, x) => s + x.resolutionLatencyMs, 0) / withLatency.length)
      : null,
    severityDistribution,
    policyDistribution,
    observability: {
      learning_false_positive: metrics.event_governance_learning_false_positive || 0,
      memory_hits: metrics.event_governance_memory_hits || 0,
      explainability_generated: metrics.event_governance_explainability_generated || 0
    }
  };
}

/**
 * @param {object} analytics
 * @returns {object[]}
 */
function generateRecommendations(analytics) {
  if (!analytics || analytics.sampleSize === 0) return [];

  const recs = [];

  for (const [policyId, count] of Object.entries(analytics.policyDistribution || {})) {
    const policySnaps = _snapshots.filter((s) => s.policyId === policyId);
    const successRate = policySnaps.filter((s) => s.success).length / Math.max(policySnaps.length, 1);
    if (count >= 3 && successRate < 0.5) {
      recs.push({
        id: `rec_policy_low_success_${policyId}`,
        type: 'policy_low_success',
        severity: 'high',
        policyId,
        evidence: { activations: count, successRate: Math.round(successRate * 1000) / 1000 },
        message: `Política ${policyId} acionada ${count}x com taxa de sucesso ${Math.round(successRate * 100)}% — revisar critérios.`,
        actionable: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  if (analytics.falsePositiveRate != null && analytics.falsePositiveRate > 0.25) {
    recs.push({
      id: 'rec_false_positive_elevated',
      type: 'false_positive_increase',
      severity: 'medium',
      evidence: { falsePositiveRate: analytics.falsePositiveRate },
      message: `Taxa de falsos positivos elevada (${Math.round(analytics.falsePositiveRate * 100)}%) — avaliar calibração de severidade.`,
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }

  if (analytics.recurrenceRate != null && analytics.recurrenceRate > 0.3) {
    recs.push({
      id: 'rec_recurrence_growth',
      type: 'recurrence_growth',
      severity: 'medium',
      evidence: { recurrenceRate: analytics.recurrenceRate },
      message: `Reincidências persistentes detectadas (taxa ${Math.round(analytics.recurrenceRate * 100)}%) — investigar causas raiz.`,
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }

  if (analytics.confidenceTrend != null && analytics.confidenceTrend < -0.1) {
    recs.push({
      id: 'rec_confidence_decline',
      type: 'confidence_decline',
      severity: 'medium',
      evidence: { confidenceTrend: analytics.confidenceTrend },
      message: `Queda contínua de confidence (${analytics.confidenceTrend}) — revisar outcomes de aprendizagem.`,
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }

  if (analytics.decisionStability != null && analytics.decisionStability < 0.6) {
    recs.push({
      id: 'rec_decision_instability',
      type: 'operational_degradation',
      severity: 'high',
      evidence: { decisionStability: analytics.decisionStability },
      message: `Estabilidade de decisões abaixo do esperado (${Math.round(analytics.decisionStability * 100)}%) — auditar executores e canais.`,
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }

  return recs;
}

/**
 * Saúde global da governança (independente de confidence/memoryScore/explainabilityScore).
 * @param {object} analytics
 */
function computeGovernanceHealthScore(analytics) {
  if (!analytics || analytics.sampleSize === 0) return 0.5;

  let score = 0.5;
  if (analytics.decisionStability != null) score += (analytics.decisionStability - 0.5) * 0.35;
  if (analytics.falsePositiveRate != null) score -= analytics.falsePositiveRate * 0.25;
  if (analytics.recurrenceRate != null) score -= analytics.recurrenceRate * 0.15;
  if (analytics.confidenceTrend != null && analytics.confidenceTrend > 0) score += 0.05;
  if (analytics.confidenceTrend != null && analytics.confidenceTrend < 0) score -= 0.1;
  if (analytics.explainabilityScoreTrend != null && analytics.explainabilityScoreTrend > 0) score += 0.05;

  score = Math.min(1, Math.max(0, score));
  return Math.round(score * 1000) / 1000;
}

/**
 * @param {string} [companyId]
 */
function buildImprovementReport(companyId) {
  const analytics = computeHealthAnalytics(companyId);
  const recommendations = generateRecommendations(analytics);
  const governanceHealthScore = computeGovernanceHealthScore(analytics);

  const trends = [];
  if (analytics.confidenceTrend != null) {
    trends.push({ metric: 'confidence', direction: analytics.confidenceTrend >= 0 ? 'up' : 'down', delta: analytics.confidenceTrend });
  }
  if (analytics.memoryScoreTrend != null) {
    trends.push({ metric: 'memoryScore', direction: analytics.memoryScoreTrend >= 0 ? 'up' : 'down', delta: analytics.memoryScoreTrend });
  }
  if (analytics.explainabilityScoreTrend != null) {
    trends.push({
      metric: 'explainabilityScore',
      direction: analytics.explainabilityScoreTrend >= 0 ? 'up' : 'down',
      delta: analytics.explainabilityScoreTrend
    });
  }

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    companyId: companyId || null,
    governanceHealthScore,
    analytics,
    trends,
    recommendations,
    openRecommendations: recommendations.filter((r) => r.actionable === false),
    evolutionHistory: {
      snapshotsBuffered: _snapshots.length,
      lastReportAt: _stats.lastReportAt
    },
    improvementOpportunities: recommendations.map((r) => r.message)
  });
}

/**
 * Ciclo completo de inteligência (observacional).
 * @param {string} [companyId]
 */
function runIntelligenceCycle(companyId) {
  if (!isIntelligenceEnabled()) {
    return { mode: 'shadow', skipped: true };
  }

  try {
    _stats.runs += 1;
    _metric(METRIC_RUNS);

    const report = buildImprovementReport(companyId);
    const newRecs = report.recommendations;

    for (const rec of newRecs) {
      const exists = _recommendations.some((r) => r.id === rec.id);
      if (!exists) {
        _recommendations.push(Object.freeze(rec));
        _metric(METRIC_RECOMMENDATIONS);
      }
    }
    while (_recommendations.length > MAX_SNAPSHOTS) _recommendations.shift();

    if (report.trends.length) {
      _metric(METRIC_TREND_DETECTIONS, report.trends.length);
    }

    _stats.lastHealthScore = report.governanceHealthScore;
    _stats.lastReportAt = report.generatedAt;
    _metric(METRIC_HEALTH_SCORE, Math.round(report.governanceHealthScore * 1000));

    return { mode: 'intelligence', report };
  } catch (err) {
    _stats.errors += 1;
    _metric(METRIC_ERRORS);
    console.warn('[governanceIntelligenceService][run]', err?.message ?? err);
    return { mode: 'error', error: err?.message };
  }
}

function getOpenRecommendations() {
  return [..._recommendations];
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const analytics = computeHealthAnalytics();

  return {
    enabled: isIntelligenceEnabled(),
    intelligence_runs: _stats.runs || metrics[METRIC_RUNS] || 0,
    recommendations_generated: metrics[METRIC_RECOMMENDATIONS] || _recommendations.length,
    governance_health_score: _stats.lastHealthScore || computeGovernanceHealthScore(analytics),
    trend_detections: metrics[METRIC_TREND_DETECTIONS] || 0,
    intelligence_errors: _stats.errors || metrics[METRIC_ERRORS] || 0,
    snapshots_buffered: _snapshots.length,
    open_recommendations: _recommendations.slice(-10),
    analytics_summary: analytics,
    last_report_at: _stats.lastReportAt
  };
}

function resetForTests() {
  _snapshots.length = 0;
  _recommendations.length = 0;
  _stats.runs = 0;
  _stats.errors = 0;
  _stats.lastHealthScore = 0.5;
  _stats.lastReportAt = null;
}

function getSnapshots(companyId) {
  return _filterSnapshots(companyId);
}

module.exports = {
  isIntelligenceEnabled,
  recordPipelineSnapshot,
  computeHealthAnalytics,
  generateRecommendations,
  computeGovernanceHealthScore,
  buildImprovementReport,
  runIntelligenceCycle,
  getOpenRecommendations,
  getAuditStatus,
  getSnapshots,
  resetForTests,
  METRIC_RUNS,
  METRIC_RECOMMENDATIONS,
  METRIC_HEALTH_SCORE,
  METRIC_TREND_DETECTIONS,
  METRIC_ERRORS
};
