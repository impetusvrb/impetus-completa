'use strict';

const _buffer = [];
const MAX = 200;

function logSupplyRuntimeEvent(kind, payload = {}) {
  const entry = {
    layer: 'supply_runtime',
    kind,
    runtime_id: payload.runtime_id || 'supply_native',
    version: payload.version || '0.1.0',
    status: payload.status || 'FOUNDATION',
    ts: new Date().toISOString(),
    ...payload
  };
  delete entry.sensitive;
  _buffer.push(entry);
  if (_buffer.length > MAX) _buffer.shift();
  if (process.env.IMPETUS_SUPPLY_DEBUG === 'true') {
    console.info('[SUPPLY_RUNTIME]', JSON.stringify(entry));
  }
  return entry;
}

function getSupplyObservabilitySnapshot(limit = 50) {
  return _buffer.slice(-limit);
}

function resetSupplyObservabilityForTests() {
  _buffer.length = 0;
}

module.exports = {
  logSupplyRuntimeEvent,
  getSupplyObservabilitySnapshot,
  resetSupplyObservabilityForTests
};
