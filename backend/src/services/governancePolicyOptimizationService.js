'use strict';

/**
 * EVENT-GOVERNANCE-17 — Policy Optimization Advisory.
 * Analisa desempenho de políticas e produz recomendações — nunca altera matching ou catálogo.
 */

const observability = require('./observabilityService');
const { getPolicies } = require('../governance/eventPolicyCatalog');

const METRIC_RUNS = 'event_governance_optimization_runs';
const METRIC_CONFLICTS = 'event_governance_policy_conflicts_detected';
const METRIC_RECOMMENDATIONS = 'event_governance_optimization_recommendations';
const METRIC_EFFECTIVENESS = 'event_governance_policy_effectiveness_score';
const METRIC_ERRORS = 'event_governance_optimization_errors';

const MAX_RECORDS = Math.max(
  100,
  parseInt(String(process.env.GOVERNANCE_POLICY_OPTIMIZATION_MAX || '500'), 10) || 500
);

/** @type {object[]} */
const _usageRecords = [];
/** @type {object[]} */
const _optimizationRecommendations = [];
/** @type {object[]} */
const _detectedConflicts = [];
/** @type {{ runs: number, errors: number }} */
const _stats = { runs: 0, errors: 0 };

function isPolicyOptimizationEnabled() {
  return String(process.env.EVENT_GOVERNANCE_POLICY_OPTIMIZATION || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _collectSnapshots(companyId) {
  const records = companyId
    ? _usageRecords.filter((r) => String(r.companyId) === String(companyId))
    : [..._usageRecords];

  try {
    const intelligence = require('./governanceIntelligenceService');
    if (typeof intelligence.getSnapshots === 'function') {
      const ext = intelligence.getSnapshots(companyId);
      for (const s of ext) {
        if (!records.some((r) => r.eventId === s.eventId && r.policyId === s.policyId)) {
          records.push(s);
        }
      }
    }
  } catch {
    /* optional merge */
  }

  return records;
}

/**
 * Registo passivo de utilização de política (flag ON).
 */
function recordPolicyObservation(event, governanceResult) {
  if (!isPolicyOptimizationEnabled() || !event?.companyId) {
    return { recorded: false };
  }

  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const execResult = governanceResult?.execResult || {};

  const record = Object.freeze({
    companyId: event.companyId,
    eventId: decision.eventId || event.eventId,
    policyId: decision.policyId || evaluation.policyId || 'UNMATCHED',
    category: event.category || decision.category,
    severity: decision.severity || event.severity,
    success: execResult.success === true,
    falsePositiveHint:
      execResult.success === false && (decision.severity === 'low' || decision.severity === 'medium'),
    recurrenceRate: evaluation.decisionContext?.memory?.recurrenceRate ?? null,
    resolutionLatencyMs: execResult.latencyMs ?? null,
    timestamp: new Date().toISOString()
  });

  _usageRecords.push(record);
  while (_usageRecords.length > MAX_RECORDS) _usageRecords.shift();

  return { recorded: true, record };
}

/**
 * Analytics determinísticos por política.
 * @param {string} policyId
 * @param {object[]} snapshots
 */
function computePolicyAnalytics(policyId, snapshots) {
  const related = snapshots.filter((s) => s.policyId === policyId);
  const catalogPolicy = getPolicies().find((p) => p.id === policyId);

  if (!related.length) {
    return {
      policyId,
      usageFrequency: 0,
      successRate: null,
      falsePositiveRate: null,
      recurrenceRate: null,
      averageResolutionTimeMs: null,
      stability: null,
      inCatalog: !!catalogPolicy
    };
  }

  const n = related.length;
  const successes = related.filter((s) => s.success).length;
  const falsePos = related.filter((s) => s.falsePositiveHint).length;
  const withRec = related.filter((s) => s.recurrenceRate != null && s.recurrenceRate > 0);
  const withLat = related.filter((s) => s.resolutionLatencyMs != null);

  return {
    policyId,
    usageFrequency: n,
    successRate: Math.round((successes / n) * 1000) / 1000,
    falsePositiveRate: Math.round((falsePos / n) * 1000) / 1000,
    recurrenceRate: withRec.length
      ? Math.round((withRec.reduce((s, x) => s + x.recurrenceRate, 0) / withRec.length) * 1000) / 1000
      : 0,
    averageResolutionTimeMs: withLat.length
      ? Math.round(withLat.reduce((s, x) => s + x.resolutionLatencyMs, 0) / withLat.length)
      : null,
    stability: Math.round((successes / n) * 1000) / 1000,
    inCatalog: !!catalogPolicy
  };
}

function _severityOverlap(a, b) {
  const sa = new Set(a || []);
  const sb = new Set(b || []);
  if (!sa.size || !sb.size) return true;
  for (const s of sa) {
    if (sb.has(s)) return true;
  }
  return false;
}

function _moduleOverlap(a, b) {
  const ma = a || [];
  const mb = b || [];
  if (!ma.length || !mb.length) return false;
  return ma.some((m) => mb.includes(m));
}

function _channelOverlap(a, b) {
  const ca = new Set(a || []);
  const cb = new Set(b || []);
  for (const c of ca) {
    if (cb.has(c)) return true;
  }
  return false;
}

/**
 * Detecção de conflitos potenciais no catálogo (read-only).
 */
function detectConflicts() {
  const policies = getPolicies();
  const conflicts = [];

  for (let i = 0; i < policies.length; i++) {
    for (let j = i + 1; j < policies.length; j++) {
      const a = policies[i];
      const b = policies[j];
      if (a.category !== b.category) continue;
      if (!_severityOverlap(a.severities, b.severities)) continue;

      const sharedModule = _moduleOverlap(a.sourceModules, b.sourceModules);
      const sharedChannel = _channelOverlap(a.channels, b.channels);

      if (sharedModule || sharedChannel) {
        conflicts.push(
          Object.freeze({
            type: 'potential_overlap',
            policyA: a.id,
            policyB: b.id,
            category: a.category,
            reason: sharedModule ? 'shared_source_module' : 'shared_channels',
            severity: 'medium'
          })
        );
      }
    }
  }

  return conflicts;
}

/**
 * Redundâncias — mesma categoria, canais idênticos, escalationLevel igual.
 */
function detectRedundancies() {
  const policies = getPolicies();
  const redundancies = [];

  for (let i = 0; i < policies.length; i++) {
    for (let j = i + 1; j < policies.length; j++) {
      const a = policies[i];
      const b = policies[j];
      if (a.category !== b.category) continue;
      if (a.escalationLevel !== b.escalationLevel) continue;
      if (JSON.stringify([...(a.channels || [])].sort()) === JSON.stringify([...(b.channels || [])].sort())) {
        redundancies.push(
          Object.freeze({
            type: 'redundancy',
            policyA: a.id,
            policyB: b.id,
            category: a.category,
            channels: a.channels
          })
        );
      }
    }
  }

  return redundancies;
}

/**
 * policyEffectivenessScore — independente de confidence/memoryScore/explainabilityScore/healthScore.
 * @param {object} analytics
 */
function computePolicyEffectivenessScore(analytics) {
  if (!analytics || analytics.usageFrequency === 0) return 0;

  let score = 0.3;
  if (analytics.successRate != null) score += analytics.successRate * 0.35;
  if (analytics.stability != null) score += analytics.stability * 0.15;
  if (analytics.falsePositiveRate != null) score -= analytics.falsePositiveRate * 0.25;
  if (analytics.recurrenceRate != null) score -= analytics.recurrenceRate * 0.1;

  if (analytics.usageFrequency >= 5) score += 0.05;

  score = Math.min(1, Math.max(0, score));
  return Math.round(score * 1000) / 1000;
}

/**
 * @param {string} [companyId]
 */
function buildOptimizationRecommendations(companyId) {
  const snapshots = _collectSnapshots(companyId);
  const policies = getPolicies();
  const recs = [];

  const conflicts = detectConflicts();
  const redundancies = detectRedundancies();

  for (const c of conflicts) {
    recs.push({
      id: `opt_conflict_${c.policyA}_${c.policyB}`,
      type: 'potential_conflict',
      policyIds: [c.policyA, c.policyB],
      severity: c.severity,
      message: `Conflito potencial entre ${c.policyA} e ${c.policyB} (${c.reason}).`,
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }

  for (const r of redundancies) {
    recs.push({
      id: `opt_redundancy_${r.policyA}_${r.policyB}`,
      type: 'redundancy_identified',
      policyIds: [r.policyA, r.policyB],
      message: `Redundância entre ${r.policyA} e ${r.policyB} (categoria ${r.category}).`,
      actionable: false,
      timestamp: new Date().toISOString()
    });
  }

  const usageByPolicy = {};
  for (const s of snapshots) {
    usageByPolicy[s.policyId] = (usageByPolicy[s.policyId] || 0) + 1;
  }

  for (const policy of policies) {
    const analytics = computePolicyAnalytics(policy.id, snapshots);
    const effectiveness = computePolicyEffectivenessScore(analytics);

    if (analytics.usageFrequency === 0) {
      recs.push({
        id: `opt_underused_${policy.id}`,
        type: 'policy_underutilized',
        policyId: policy.id,
        policyEffectivenessScore: effectiveness,
        message: `Política ${policy.id} pouco ou nunca utilizada — candidata a revisão de activação.`,
        actionable: false,
        timestamp: new Date().toISOString()
      });
    }

    if (analytics.usageFrequency >= 3 && analytics.successRate != null && analytics.successRate < 0.5) {
      recs.push({
        id: `opt_low_effectiveness_${policy.id}`,
        type: 'policy_low_effectiveness',
        policyId: policy.id,
        policyEffectivenessScore: effectiveness,
        evidence: { successRate: analytics.successRate, usageFrequency: analytics.usageFrequency },
        message: `Política ${policy.id} com baixa efetividade (${Math.round(analytics.successRate * 100)}% sucesso).`,
        actionable: false,
        timestamp: new Date().toISOString()
      });
    }

    if (analytics.falsePositiveRate != null && analytics.falsePositiveRate > 0.3) {
      recs.push({
        id: `opt_fp_${policy.id}`,
        type: 'policy_review_candidate',
        policyId: policy.id,
        message: `Política ${policy.id} candidata à revisão — falsos positivos elevados.`,
        actionable: false,
        timestamp: new Date().toISOString()
      });
    }
  }

  return recs;
}

/**
 * @param {string} [companyId]
 */
function buildOptimizationReport(companyId) {
  const snapshots = _collectSnapshots(companyId);
  const policies = getPolicies();
  const conflicts = detectConflicts();
  const redundancies = detectRedundancies();

  const policyAnalytics = policies.map((p) => {
    const analytics = computePolicyAnalytics(p.id, snapshots);
    return {
      ...analytics,
      policyEffectivenessScore: computePolicyEffectivenessScore(analytics)
    };
  });

  const recommendations = buildOptimizationRecommendations(companyId);
  const avgEffectiveness =
    policyAnalytics.filter((p) => p.usageFrequency > 0).length > 0
      ? policyAnalytics
          .filter((p) => p.usageFrequency > 0)
          .reduce((s, p) => s + p.policyEffectivenessScore, 0) /
        policyAnalytics.filter((p) => p.usageFrequency > 0).length
      : 0;

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    companyId: companyId || null,
    policyAnalytics,
    conflicts,
    redundancies,
    recommendations,
    averagePolicyEffectivenessScore: Math.round(avgEffectiveness * 1000) / 1000,
    snapshotsAnalyzed: snapshots.length
  });
}

/**
 * @param {string} [companyId]
 */
function runOptimizationCycle(companyId) {
  if (!isPolicyOptimizationEnabled()) {
    return { mode: 'shadow', skipped: true };
  }

  try {
    _stats.runs += 1;
    _metric(METRIC_RUNS);

    const report = buildOptimizationReport(companyId);

    _detectedConflicts.length = 0;
    for (const c of report.conflicts) {
      _detectedConflicts.push(c);
      _metric(METRIC_CONFLICTS);
    }

    for (const rec of report.recommendations) {
      if (!_optimizationRecommendations.some((r) => r.id === rec.id)) {
        _optimizationRecommendations.push(Object.freeze(rec));
        _metric(METRIC_RECOMMENDATIONS);
      }
    }
    while (_optimizationRecommendations.length > MAX_RECORDS) _optimizationRecommendations.shift();

    if (report.averagePolicyEffectivenessScore > 0) {
      _metric(METRIC_EFFECTIVENESS, Math.round(report.averagePolicyEffectivenessScore * 1000));
    }

    return { mode: 'optimization', report };
  } catch (err) {
    _stats.errors += 1;
    _metric(METRIC_ERRORS);
    console.warn('[governancePolicyOptimizationService][run]', err?.message ?? err);
    return { mode: 'error', error: err?.message };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const report = isPolicyOptimizationEnabled() ? buildOptimizationReport() : null;

  return {
    enabled: isPolicyOptimizationEnabled(),
    optimization_runs: _stats.runs || metrics[METRIC_RUNS] || 0,
    policy_conflicts_detected: metrics[METRIC_CONFLICTS] || _detectedConflicts.length,
    optimization_recommendations: metrics[METRIC_RECOMMENDATIONS] || _optimizationRecommendations.length,
    policy_effectiveness_score: report?.averagePolicyEffectivenessScore ?? null,
    optimization_errors: _stats.errors || metrics[METRIC_ERRORS] || 0,
    open_recommendations: _optimizationRecommendations.slice(-10),
    conflicts: _detectedConflicts.slice(-10),
    usage_records_buffered: _usageRecords.length
  };
}

function resetForTests() {
  _usageRecords.length = 0;
  _optimizationRecommendations.length = 0;
  _detectedConflicts.length = 0;
  _stats.runs = 0;
  _stats.errors = 0;
}

module.exports = {
  isPolicyOptimizationEnabled,
  recordPolicyObservation,
  computePolicyAnalytics,
  detectConflicts,
  detectRedundancies,
  computePolicyEffectivenessScore,
  buildOptimizationRecommendations,
  buildOptimizationReport,
  runOptimizationCycle,
  getAuditStatus,
  resetForTests,
  METRIC_RUNS,
  METRIC_CONFLICTS,
  METRIC_RECOMMENDATIONS,
  METRIC_EFFECTIVENESS,
  METRIC_ERRORS
};
