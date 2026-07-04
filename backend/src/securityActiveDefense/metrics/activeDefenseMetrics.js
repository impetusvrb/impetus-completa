'use strict';

/**
 * SEC-10 — Active Defense metrics.
 */

const counters = {
  active_defense_events: 0,
  active_defense_recommendations: 0,
  active_defense_modes: 0,
  attack_patterns_detected: 0,
  campaigns_detected: 0,
  distributed_scans: 0,
  critical_incidents: 0,
  defense_state_changes: 0,
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
