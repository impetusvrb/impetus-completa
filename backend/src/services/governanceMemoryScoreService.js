'use strict';

/**
 * EVENT-GOVERNANCE-14 — memoryScore (0.0–1.0), independente de confidence.
 */

const observability = require('./observabilityService');
const memory = require('./governanceOperationalMemoryService');

const METRIC_MEMORY_SCORE = 'event_governance_memory_score_computed';
const DEFAULT_MEMORY_SCORE = 0.0;

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

/**
 * @param {object} memoryContext — saída de buildMemoryContext
 * @returns {number}
 */
function computeMemoryScore(memoryContext) {
  if (!memoryContext || !memoryContext.similarCases?.length) {
    return DEFAULT_MEMORY_SCORE;
  }

  const cases = memoryContext.similarCases;
  const n = cases.length;
  const avgSimilarity =
    cases.reduce((s, c) => s + (c.similarityScore || 0), 0) / Math.max(n, 1);
  const resolutionRate = memoryContext.historicalResolutionRate ?? 0;
  const recurrencePenalty = Math.min(0.3, (memoryContext.recurrenceRate ?? 0) * 0.15);
  const fpPenalty = Math.min(0.25, (memoryContext.falsePositiveRate ?? 0) * 0.3);
  const histConf = memoryContext.historicalConfidence ?? 0.5;

  let score =
    Math.min(1, avgSimilarity / 8) * 0.35 +
    resolutionRate * 0.25 +
    histConf * 0.2 +
    Math.min(1, n / 5) * 0.2 -
    recurrencePenalty -
    fpPenalty;

  score = Math.min(1, Math.max(0, score));
  const rounded = Math.round(score * 1000) / 1000;
  _metric(METRIC_MEMORY_SCORE);
  return rounded;
}

/**
 * @param {string} companyId
 * @param {object} query
 * @param {object} memoryContext
 */
function resolveMemoryScore(companyId, query, memoryContext) {
  if (!memory.isMemoryEnabled()) {
    return DEFAULT_MEMORY_SCORE;
  }
  if (memoryContext?.memoryScore != null) {
    return memoryContext.memoryScore;
  }
  return computeMemoryScore(memoryContext);
}

function resetForTests() {
  /* stateless */
}

module.exports = {
  DEFAULT_MEMORY_SCORE,
  computeMemoryScore,
  resolveMemoryScore,
  resetForTests,
  METRIC_MEMORY_SCORE
};
