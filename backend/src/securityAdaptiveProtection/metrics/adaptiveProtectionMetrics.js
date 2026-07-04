'use strict';

/**
 * SEC-11 — Adaptive Protection metrics.
 */

const counters = {
  adaptive_protection_plans: 0,
  runtime_protection_score: 0,
  recommended_profiles: 0,
  approval_requests: 0,
  approved_protections: 0,
  recovery_plans: 0,
  rollback_plans: 0,
  scanner_patterns: 0,
  evaluations: 0,
  evaluation_time_ms: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function setRuntimeScore(score) {
  counters.runtime_protection_score = Math.min(1, Math.max(0, Number(score) || 0));
}

function recordEvaluationTime(ms) {
  counters.evaluation_time_ms = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => {
    if (k === 'runtime_protection_score') counters[k] = 0;
    else counters[k] = 0;
  });
}

module.exports = { increment, setRuntimeScore, recordEvaluationTime, getSnapshot, resetForTests };
