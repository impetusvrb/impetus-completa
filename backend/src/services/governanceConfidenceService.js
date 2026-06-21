'use strict';

/**
 * EVENT-GOVERNANCE-13 — score de confiança adaptativo (0.0–1.0).
 * Enriquece decisões; não altera matching de políticas.
 */

const observability = require('./observabilityService');
const learning = require('./governanceLearningService');

const METRIC_CONFIDENCE_UPDATES = 'event_governance_confidence_updates';
const DEFAULT_CONFIDENCE = 0.5;

/** @type {Map<string, number>} */
const _confidenceCache = new Map();

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _cacheKey(companyId, policyId, insightId) {
  return `${companyId || 'global'}:${policyId || 'unknown'}:${insightId || '*'}`;
}

/**
 * @param {object} params
 * @param {string} [params.companyId]
 * @param {string} [params.policyId]
 * @param {string} [params.insightId]
 * @returns {number}
 */
function computeConfidenceScore(params = {}) {
  const { companyId, policyId, insightId } = params;
  const records = [
    ...learning.getRecords(companyId, policyId, insightId),
    ...learning.getRecords(companyId, policyId, null)
  ];

  if (!records.length) {
    return DEFAULT_CONFIDENCE;
  }

  let successes = 0;
  let falsePositives = 0;
  let resolutions = 0;
  let failures = 0;
  let recurrences = 0;

  const seenEvents = new Set();
  for (const r of records) {
    if (seenEvents.has(r.eventId)) recurrences += 1;
    seenEvents.add(r.eventId);

    if (r.feedbackType === 'false_positive') falsePositives += 1;
    if (r.feedbackType === 'resolution' || r.feedbackType === 'escalation_success') {
      resolutions += 1;
      successes += 1;
    }
    if (r.feedbackType === 'escalation_failure' || r.outcome === 'failure') failures += 1;
    if (r.outcome === 'success') successes += 1;
  }

  const total = records.length;
  const successRate = successes / total;
  const fpRate = falsePositives / total;
  const resolutionRate = resolutions / total;
  const recurrenceRate = recurrences / total;

  let score =
    DEFAULT_CONFIDENCE +
    successRate * 0.25 +
    resolutionRate * 0.2 -
    fpRate * 0.35 -
    recurrenceRate * 0.1 -
    (failures / total) * 0.15;

  score = Math.min(1, Math.max(0, score));

  _confidenceCache.set(_cacheKey(companyId, policyId, insightId), score);
  _metric(METRIC_CONFIDENCE_UPDATES);

  return Math.round(score * 1000) / 1000;
}

/**
 * Confiança aplicada à decisão — baseline quando learning OFF.
 * @param {object} params
 */
function resolveDecisionConfidence(params = {}) {
  const computed = computeConfidenceScore(params);
  if (!learning.isLearningEnabled()) {
    return DEFAULT_CONFIDENCE;
  }
  return computed;
}

function getCachedConfidence(companyId, policyId, insightId) {
  const key = _cacheKey(companyId, policyId, insightId);
  if (_confidenceCache.has(key)) return _confidenceCache.get(key);
  return computeConfidenceScore({ companyId, policyId, insightId });
}

function getObservedConfidence(params = {}) {
  return computeConfidenceScore(params);
}

function resetForTests() {
  _confidenceCache.clear();
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    default_confidence: DEFAULT_CONFIDENCE,
    cached_scores: _confidenceCache.size,
    confidence_updates: metrics[METRIC_CONFIDENCE_UPDATES] || 0
  };
}

module.exports = {
  DEFAULT_CONFIDENCE,
  computeConfidenceScore,
  resolveDecisionConfidence,
  getObservedConfidence,
  getCachedConfidence,
  resetForTests,
  getAuditStatus,
  METRIC_CONFIDENCE_UPDATES
};
