'use strict';

/**
 * EVENT-GOVERNANCE-14 — lookup e registo de memória operacional (enriquecimento contextual).
 * Nunca altera matching nem decisão automática.
 */

const observability = require('./observabilityService');
const memory = require('./governanceOperationalMemoryService');
const memoryScore = require('./governanceMemoryScoreService');

const METRIC_LOOKUPS = 'event_governance_memory_lookups';
const METRIC_HITS = 'event_governance_memory_hits';
const METRIC_MISSES = 'event_governance_memory_misses';

/** @type {{ lookups: number, hits: number, misses: number }} */
const _stats = { lookups: 0, hits: 0, misses: 0 };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

/**
 * Memory lookup antes da decisão final / AIOI.
 * @param {object} event
 * @param {object} [policyMatch]
 */
function buildMemoryContext(event, policyMatch) {
  if (!event?.companyId || !memory.isMemoryEnabled()) {
    return null;
  }

  _stats.lookups += 1;
  _metric(METRIC_LOOKUPS);

  const query = {
    eventType: event.eventType,
    category: event.category || policyMatch?.category,
    policyId: policyMatch?.id,
    sourceModule: event.sourceModule,
    severity: event.severity,
    payload: event.payload
  };

  const similarCases = memory.findSimilarCases(event.companyId, query, { limit: 5 });

  if (!similarCases.length) {
    _stats.misses += 1;
    _metric(METRIC_MISSES);
    return {
      similarCases: [],
      historicalConfidence: null,
      recurrenceRate: 0,
      averageResolutionTime: null,
      falsePositiveRate: 0,
      historicalResolutionRate: 0,
      relatedPolicies: policyMatch?.id ? [policyMatch.id] : [],
      memoryScore: memoryScore.DEFAULT_MEMORY_SCORE
    };
  }

  _stats.hits += 1;
  _metric(METRIC_HITS);

  const resolved = similarCases.filter((c) => c.resolved);
  const falsePos = similarCases.filter((c) => c.falsePositive);
  const withTime = similarCases.filter((c) => c.resolutionTimeMs != null);
  const recurrenceRate =
    similarCases.reduce((s, c) => s + (c.recurrenceCount || 1), 0) /
    Math.max(similarCases.length, 1) /
    5;

  const confidences = similarCases
    .map((c) => c.confidenceAtTime)
    .filter((v) => Number.isFinite(v));

  const ctx = {
    similarCases: similarCases.map((c) => ({
      memoryId: c.memoryId,
      eventId: c.eventId,
      eventType: c.eventType,
      policyId: c.policyId,
      severity: c.severity,
      resolved: c.resolved,
      falsePositive: c.falsePositive,
      recurrenceCount: c.recurrenceCount,
      similarityScore: c.similarityScore,
      timestamp: c.timestamp
    })),
    historicalConfidence: confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : null,
    recurrenceRate: Math.min(1, recurrenceRate),
    averageResolutionTime: withTime.length
      ? withTime.reduce((s, c) => s + c.resolutionTimeMs, 0) / withTime.length
      : null,
    falsePositiveRate: falsePos.length / similarCases.length,
    historicalResolutionRate: resolved.length / similarCases.length,
    relatedPolicies: [...new Set(similarCases.map((c) => c.policyId).filter(Boolean))]
  };

  ctx.memoryScore = memoryScore.computeMemoryScore(ctx);
  return ctx;
}

/**
 * Consolida outcome na memória (pós-execução, após Learning).
 * @param {object} event
 * @param {object} governanceResult
 */
function registerFromExecution(event, governanceResult) {
  if (!event?.companyId) return { skipped: true };

  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const execResult = governanceResult?.execResult || {};
  if (evaluation.approved !== true) return { skipped: true, reason: 'not_approved' };

  const similar = memory.findSimilarCases(
    event.companyId,
    {
      eventType: event.eventType,
      category: event.category,
      policyId: decision.policyId,
      sourceModule: event.sourceModule,
      severity: decision.severity,
      payload: event.payload
    },
    { limit: 1, minScore: 3 }
  );

  const params = {
    companyId: event.companyId,
    eventId: decision.eventId || event.eventId,
    eventType: event.eventType,
    category: event.category || decision.category,
    severity: decision.severity,
    policyId: decision.policyId,
    sourceModule: event.sourceModule,
    payload: event.payload,
    resolved: execResult.success === true,
    falsePositive: execResult.success === false && decision.severity === 'low',
    confidenceAtTime: decision.confidence,
    resolutionTimeMs: governanceResult.execResult?.latencyMs || null
  };

  if (similar.length) {
    return memory.registerRecurrence(params);
  }
  return memory.registerDecision(params);
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    enabled: memory.isMemoryEnabled(),
    lookups: _stats.lookups || metrics[METRIC_LOOKUPS] || 0,
    hits: _stats.hits || metrics[METRIC_HITS] || 0,
    misses: _stats.misses || metrics[METRIC_MISSES] || 0,
    ...memory.getMemoryStats(),
    top_patterns: memory.getTopPatterns(5)
  };
}

function resetStatsForTests() {
  _stats.lookups = 0;
  _stats.hits = 0;
  _stats.misses = 0;
}

module.exports = {
  buildMemoryContext,
  registerFromExecution,
  getAuditStatus,
  resetStatsForTests,
  METRIC_LOOKUPS,
  METRIC_HITS,
  METRIC_MISSES
};
