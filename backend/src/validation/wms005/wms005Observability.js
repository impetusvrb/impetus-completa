'use strict';

const _entries = [];

function logWms005Event(event = {}) {
  _entries.push(Object.freeze({ ts: new Date().toISOString(), layer: 'WMS-005', ...event }));
  if (_entries.length > 500) _entries.shift();
}

function getWms005ObservabilitySnapshot(limit = 100) {
  return _entries.slice(-limit);
}

function resetWms005ObservabilityForTests() {
  _entries.length = 0;
}

module.exports = {
  logWms005Event,
  getWms005ObservabilitySnapshot,
  resetWms005ObservabilityForTests
};
