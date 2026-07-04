'use strict';

/**
 * SEC-02 — Métricas de correlação.
 */

const counters = {
  security_incidents: 0,
  incident_groups: 0,
  correlation_runs: 0,
  average_incident_duration: 0,
  average_incident_size: 0,
  correlation_errors: 0
};

const durationSamples = [];
const sizeSamples = [];

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordIncidentClosed(durationMs, eventCount) {
  durationSamples.push(durationMs);
  sizeSamples.push(eventCount);
  if (durationSamples.length > 200) durationSamples.shift();
  if (sizeSamples.length > 200) sizeSamples.shift();
  counters.average_incident_duration = Math.round(
    durationSamples.reduce((a, b) => a + b, 0) / durationSamples.length
  );
  counters.average_incident_size = Math.round(
    sizeSamples.reduce((a, b) => a + b, 0) / sizeSamples.length
  );
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
  durationSamples.length = 0;
  sizeSamples.length = 0;
}

module.exports = {
  increment,
  recordIncidentClosed,
  getSnapshot,
  resetForTests
};
