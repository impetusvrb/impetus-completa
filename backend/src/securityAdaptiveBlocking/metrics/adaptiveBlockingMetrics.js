'use strict';

const counters = {
  adaptive_blocking_events: 0,
  watchlist_ips: 0,
  quarantine_candidates: 0,
  manual_reviews: 0,
  reputation_updates: 0,
  behavior_profiles: 0,
  fingerprints_generated: 0,
  blocking_recommendations: 0,
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
