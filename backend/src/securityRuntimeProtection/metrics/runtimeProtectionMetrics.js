'use strict';

const counters = {
  runtime_profiles: 0,
  runtime_risk: 0,
  protection_plans: 0,
  runtime_approvals: 0,
  runtime_safety_checks: 0,
  recommended_profiles: 0,
  rollback_validation: 0,
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
