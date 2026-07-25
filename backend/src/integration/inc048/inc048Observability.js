'use strict';

const _entries = [];

function logInc048Event(event = {}) {
  _entries.push(
    Object.freeze({
      ts: new Date().toISOString(),
      layer: 'INC-048',
      ...event
    })
  );
  if (_entries.length > 500) _entries.shift();
}

function getInc048ObservabilitySnapshot(limit = 100) {
  return _entries.slice(-limit);
}

function resetInc048ObservabilityForTests() {
  _entries.length = 0;
}

module.exports = {
  logInc048Event,
  getInc048ObservabilitySnapshot,
  resetInc048ObservabilityForTests
};
