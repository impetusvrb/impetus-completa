'use strict';

const _entries = [];

function logSupplyApiEvent(event = {}) {
  _entries.push(
    Object.freeze({
      ts: new Date().toISOString(),
      layer: 'GF-027',
      ...event
    })
  );
  if (_entries.length > 500) _entries.shift();
}

function getSupplyApiObservabilitySnapshot(limit = 100) {
  return _entries.slice(-limit);
}

function resetSupplyApiObservabilityForTests() {
  _entries.length = 0;
}

module.exports = {
  logSupplyApiEvent,
  getSupplyApiObservabilitySnapshot,
  resetSupplyApiObservabilityForTests
};
