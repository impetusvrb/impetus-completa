'use strict';

/**
 * SEC-13 — Controlled execution metrics.
 */

const counters = {
  controlled_executions: 0,
  automatic_actions: 0,
  manual_actions: 0,
  blocked_actions: 0,
  rollbacks: 0,
  execution_duration: 0,
  execution_failures: 0,
  execution_safety_score: 100
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordDuration(ms) {
  counters.execution_duration = ms;
}

function setSafetyScore(score) {
  counters.execution_safety_score = Math.min(100, Math.max(0, Math.floor(score)));
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => {
    counters[k] = k === 'execution_safety_score' ? 100 : 0;
  });
}

module.exports = { increment, recordDuration, setSafetyScore, getSnapshot, resetForTests };
