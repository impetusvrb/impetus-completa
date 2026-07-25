'use strict';

const _entries = [];

function logWms006Event(event = {}) {
  _entries.push(Object.freeze({ ts: new Date().toISOString(), layer: 'WMS-006', ...event }));
  if (_entries.length > 500) _entries.shift();
}

function getWms006ObservabilitySnapshot(limit = 100) {
  return _entries.slice(-limit);
}

function resetWms006ObservabilityForTests() {
  _entries.length = 0;
}

module.exports = {
  logWms006Event,
  getWms006ObservabilitySnapshot,
  resetWms006ObservabilityForTests
};
