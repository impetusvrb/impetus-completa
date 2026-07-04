'use strict';

const counters = {
  deception_plans: 0,
  deception_candidates: 0,
  engagement_profiles: 0,
  fake_resource_recommendations: 0,
  evidence_enrichment: 0,
  attacker_persistence: 0,
  scanner_sophistication: 0,
  evaluations: 0,
  evaluation_time_ms: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function setGauge(name, value) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] = value;
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

module.exports = { increment, setGauge, recordEvaluationTime, getSnapshot, resetForTests };
