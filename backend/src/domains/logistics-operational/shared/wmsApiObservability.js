'use strict';

const _buffer = [];
const MAX = 500;

function logWmsApiEvent(meta = {}) {
  const entry = Object.freeze({
    layer: 'WMS_API',
    phase: 'WMS-003',
    method: meta.method || null,
    path: meta.path || null,
    status: meta.status || null,
    duration_ms: meta.duration_ms != null ? Math.round(meta.duration_ms) : null,
    routing: meta.routing || null,
    adapter: meta.adapter || null,
    contract: meta.contract || null,
    fallback: meta.fallback === true,
    error: meta.error || null,
    ts: new Date().toISOString()
  });
  _buffer.push(entry);
  if (_buffer.length > MAX) _buffer.shift();
  return entry;
}

function getWmsApiObservabilitySnapshot(limit = 100) {
  return _buffer.slice(-limit);
}

function resetWmsApiObservabilityForTests() {
  _buffer.length = 0;
}

module.exports = {
  logWmsApiEvent,
  getWmsApiObservabilitySnapshot,
  resetWmsApiObservabilityForTests
};
