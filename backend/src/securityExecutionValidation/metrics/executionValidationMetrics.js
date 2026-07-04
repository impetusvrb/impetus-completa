'use strict';

/**
 * SEC-12 — Execution Validation metrics.
 */

const counters = {
  validated_actions: 0,
  blocked_actions: 0,
  dry_runs: 0,
  rollback_validations: 0,
  execution_scores: 0,
  approval_failures: 0,
  impact_assessments: 0,
  evaluations: 0,
  evaluation_time_ms: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordEvaluationTime(ms) {
  counters.evaluation_time_ms = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, recordEvaluationTime, getSnapshot, resetForTests };
