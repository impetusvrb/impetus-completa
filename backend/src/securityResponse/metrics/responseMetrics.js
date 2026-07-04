'use strict';

/**
 * SEC-06 — Response metrics.
 */

const counters = {
  responses_generated: 0,
  responses_executed: 0,
  responses_cancelled: 0,
  operator_approvals: 0,
  assist_actions: 0,
  response_latency: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordLatency(ms) {
  counters.response_latency = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, recordLatency, getSnapshot, resetForTests };
