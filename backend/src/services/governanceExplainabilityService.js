'use strict';

/**
 * EVENT-GOVERNANCE-15 — Explainable Governance (XAI operacional determinístico).
 * Consolida evidências e produz decisionTrace — nunca altera decisões.
 */

const crypto = require('crypto');
const observability = require('./observabilityService');
const { getPolicies } = require('../governance/eventPolicyCatalog');
const { buildGovernanceExplainabilityDto } = require('../governance/governanceExplainabilityDto');

const METRIC_HITS = 'event_governance_explainability_hits';
const METRIC_GENERATED = 'event_governance_explainability_generated';
const METRIC_ERRORS = 'event_governance_explainability_errors';
const METRIC_AVG_SCORE = 'event_governance_explainability_avg_score';

const MAX_TRACES = Math.max(
  50,
  parseInt(String(process.env.GOVERNANCE_EXPLAINABILITY_MAX_TRACES || '200'), 10) || 200
);

/** @type {object[]} */
const _traceBuffer = [];
/** @type {{ generated: number, errors: number, scoreSum: number }} */
const _stats = { generated: 0, errors: 0, scoreSum: 0 };

function isExplainabilityEnabled() {
  return String(process.env.EVENT_GOVERNANCE_EXPLAINABILITY || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _snapshotEvent(event) {
  return Object.freeze({
    eventId: event.eventId || null,
    eventType: String(event.eventType || 'unknown'),
    category: String(event.category || 'general'),
    severity: String(event.severity || 'medium'),
    sourceModule: String(event.sourceModule || 'unknown'),
    companyId: event.companyId || null,
    origin: event.payload?.origin || event.payload?.source || null
  });
}

function _buildMatchedPolicies(evaluation, event) {
  const matched = evaluation?.policyId || evaluation?.decision?.policyId;
  if (!matched) return [];

  const all = getPolicies();
  const policy = all.find((p) => p.id === matched);
  const candidates = all.filter((p) => {
    const cat = String(p.category || '').toLowerCase();
    const evCat = String(event.category || 'general').toLowerCase();
    return cat === evCat || cat === '*';
  });

  return Object.freeze([
    Object.freeze({
      policyId: matched,
      category: policy?.category || event.category,
      channels: policy?.channels || evaluation.channels || [],
      recipientStrategies: policy?.recipientStrategies || [],
      selected: true
    }),
    ...candidates
      .filter((p) => p.id !== matched)
      .slice(0, 3)
      .map((p) =>
        Object.freeze({
          policyId: p.id,
          category: p.category,
          selected: false
        })
      )
  ]);
}

/**
 * Consolida evidências factuais (sem IA generativa).
 * @param {object} event
 * @param {object} governanceResult
 * @param {object} [extras]
 */
function buildEvidence(event, governanceResult, extras = {}) {
  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const memory = evaluation.decisionContext?.memory || null;
  const execResult = governanceResult?.execResult || {};

  return Object.freeze({
    policiesUsed: decision.policyId ? [decision.policyId] : [],
    rulesTriggered: decision.policyId
      ? [`policy_match:${decision.policyId}`, `severity:${decision.severity || event.severity}`]
      : ['policy_unmatched'],
    confidence: decision.confidence ?? null,
    memoryScore: memory?.memoryScore ?? null,
    similarCasesCount: memory?.similarCases?.length ?? 0,
    recurrenceRate: memory?.recurrenceRate ?? null,
    historicalResolutionRate: memory?.historicalResolutionRate ?? null,
    falsePositiveRate: memory?.falsePositiveRate ?? null,
    historicalConfidence: memory?.historicalConfidence ?? null,
    severity: decision.severity || event.severity,
    escalationLevel: decision.escalationLevel ?? 0,
    priority: decision.severity === 'critical' ? 'high' : decision.severity === 'high' ? 'elevated' : 'normal',
    origin: event.payload?.origin || event.sourceModule || null,
    aioiInsights: extras.aioiResult?.insights ?? extras.aioiResult?.results?.length ?? 0,
    distributionSuccess: execResult.success === true,
    channelsExecuted: execResult.channelsExecuted || []
  });
}

/**
 * @param {object} event
 * @param {object} governanceResult
 * @param {object} [extras]
 */
function buildDecisionTrace(event, governanceResult, extras = {}) {
  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const execResult = governanceResult?.execResult || {};
  const memory = evaluation.decisionContext?.memory || null;

  return Object.freeze({
    event: _snapshotEvent(event),
    matchedPolicies: _buildMatchedPolicies(evaluation, event),
    memory: memory
      ? Object.freeze({
          similarCases: memory.similarCases || [],
          memoryScore: memory.memoryScore,
          recurrenceRate: memory.recurrenceRate,
          historicalConfidence: memory.historicalConfidence
        })
      : null,
    learning: Object.freeze({
      confidence: decision.confidence ?? null,
      source: 'governanceConfidenceService'
    }),
    aioi: extras.aioiResult
      ? Object.freeze({
          mode: extras.aioiResult.mode,
          correlations: extras.aioiResult.correlations ?? 0,
          insights: extras.aioiResult.insights ?? 0,
          skipped: extras.aioiResult.skipped === true
        })
      : null,
    decision: Object.freeze({
      approved: evaluation.approved === true,
      policyId: decision.policyId || evaluation.policyId,
      severity: decision.severity,
      escalationLevel: decision.escalationLevel ?? 0,
      channels: decision.channels || evaluation.channels || [],
      confidence: decision.confidence ?? null
    }),
    distribution: Object.freeze({
      success: execResult.success === true,
      dryRun: execResult.dryRun === true,
      channelsExecuted: execResult.channelsExecuted || [],
      channelsFailed: execResult.channelsFailed || [],
      latencyMs: execResult.latencyMs ?? null
    })
  });
}

/**
 * Grau de completude da explicação (independente de confidence e memoryScore).
 * @param {object} trace
 */
function computeExplainabilityScore(trace) {
  if (!trace) return 0;

  let score = 0;
  if (trace.event?.eventType) score += 0.1;
  if (trace.matchedPolicies?.length) score += 0.15;
  if (trace.memory) score += 0.15;
  if (trace.learning?.confidence != null) score += 0.15;
  if (trace.decision?.policyId) score += 0.2;
  if (trace.distribution) score += 0.15;
  if (trace.aioi && !trace.aioi.skipped) score += 0.1;

  return Math.round(Math.min(1, score) * 1000) / 1000;
}

/**
 * @param {object} event
 * @param {object} governanceResult
 * @param {object} [extras]
 */
function buildExplanation(event, governanceResult, extras = {}) {
  if (!isExplainabilityEnabled()) {
    return null;
  }

  try {
    _metric(METRIC_HITS);

    const decisionTrace = buildDecisionTrace(event, governanceResult, extras);
    const evidence = buildEvidence(event, governanceResult, extras);
    const explainabilityScore = computeExplainabilityScore(decisionTrace);

    const factors = [];
    if (decisionTrace.decision?.policyId) {
      factors.push(`policy:${decisionTrace.decision.policyId}`);
    }
    if (evidence.confidence != null) {
      factors.push(`confidence:${evidence.confidence}`);
    }
    if (evidence.memoryScore != null) {
      factors.push(`memoryScore:${evidence.memoryScore}`);
    }
    if (evidence.similarCasesCount > 0) {
      factors.push(`similarCases:${evidence.similarCasesCount}`);
    }
    if (decisionTrace.aioi?.insights > 0) {
      factors.push(`aioiInsights:${decisionTrace.aioi.insights}`);
    }

    const dto = buildGovernanceExplainabilityDto({
      eventId: decisionTrace.decision?.policyId ? governanceResult.evaluation?.decision?.eventId : event.eventId,
      companyId: event.companyId,
      explainabilityScore,
      decisionTrace,
      evidence,
      factors,
      rulesApplied: evidence.rulesTriggered
    });

    _traceBuffer.push(dto);
    while (_traceBuffer.length > MAX_TRACES) _traceBuffer.shift();

    _stats.generated += 1;
    _stats.scoreSum += explainabilityScore;
    _metric(METRIC_GENERATED);
    _metric(METRIC_AVG_SCORE, Math.round(explainabilityScore * 1000));

    return dto;
  } catch (err) {
    _stats.errors += 1;
    _metric(METRIC_ERRORS);
    console.warn('[governanceExplainabilityService][build]', err?.message ?? err);
    return null;
  }
}

/**
 * Enriquece resultado interno do pipeline (não altera DTOs públicos).
 * @param {object} event
 * @param {object} governanceResult
 * @param {object} [extras]
 */
function enrichResult(event, governanceResult, extras = {}) {
  const explanation = buildExplanation(event, governanceResult, extras);
  if (!explanation) {
    return governanceResult;
  }

  governanceResult.decisionTrace = explanation.decisionTrace;
  governanceResult.explainability = explanation;
  return governanceResult;
}

function getRecentTraces(limit = 20) {
  return _traceBuffer.slice(-limit);
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const generated = _stats.generated || metrics[METRIC_GENERATED] || 0;
  const avgScore = generated > 0 ? _stats.scoreSum / generated : 0;

  return {
    enabled: isExplainabilityEnabled(),
    explainability_hits: metrics[METRIC_HITS] || 0,
    explainability_generated: generated,
    explainability_errors: _stats.errors || metrics[METRIC_ERRORS] || 0,
    average_explainability_score: Math.round(avgScore * 1000) / 1000,
    traces_buffered: _traceBuffer.length,
    recent_traces: getRecentTraces(5)
  };
}

function resetForTests() {
  _traceBuffer.length = 0;
  _stats.generated = 0;
  _stats.errors = 0;
  _stats.scoreSum = 0;
}

module.exports = {
  isExplainabilityEnabled,
  buildEvidence,
  buildDecisionTrace,
  computeExplainabilityScore,
  buildExplanation,
  enrichResult,
  getRecentTraces,
  getAuditStatus,
  resetForTests,
  METRIC_HITS,
  METRIC_GENERATED,
  METRIC_ERRORS,
  METRIC_AVG_SCORE
};
