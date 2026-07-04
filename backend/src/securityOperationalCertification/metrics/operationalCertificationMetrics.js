'use strict';

/**
 * SEC-19 — Observabilidade da certificação operacional.
 */

const counters = {
  attack_simulations: 0,
  stress_runs: 0,
  operational_certifications: 0,
  false_positive_rate: 0,
  false_negative_rate: 0,
  operational_score: 0,
  security_readiness: 0,
  certification_runs: 0
};

function increment(key, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, key)) {
    counters[key] += amount;
  }
}

function setGauge(key, value) {
  if (Object.prototype.hasOwnProperty.call(counters, key)) {
    counters[key] = Number(value) || 0;
  }
}

function getSnapshot() {
  return { ...counters, capturedAt: new Date().toISOString() };
}

function resetForTests() {
  for (const k of Object.keys(counters)) counters[k] = 0;
}

module.exports = { increment, setGauge, getSnapshot, resetForTests };
