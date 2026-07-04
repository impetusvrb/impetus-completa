'use strict';

const counters = {
  scanner_detections: 0,
  enumeration_attempts: 0,
  surface_profiles: 0,
  scanner_confidence: 0,
  enumeration_confidence: 0,
  recommended_surface_changes: 0,
  anti_scanner_reports: 0,
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
