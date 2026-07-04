'use strict';

/**
 * SEC-04 — Integrity metrics.
 */

const counters = {
  integrity_checks: 0,
  baseline_matches: 0,
  configuration_drifts: 0,
  runtime_drifts: 0,
  filesystem_drifts: 0,
  network_drifts: 0,
  integrity_failures: 0,
  integrity_score: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function setIntegrityScore(score) {
  counters.integrity_score = score;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, setIntegrityScore, getSnapshot, resetForTests };
