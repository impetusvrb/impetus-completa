'use strict';

/**
 * WMS-002 — Logging estruturado OCL (sem dados sensíveis).
 */

const _buffer = [];
const MAX = 500;

function _push(entry) {
  _buffer.push({ ...entry, ts: new Date().toISOString() });
  if (_buffer.length > MAX) _buffer.shift();
}

function logOclResolution({ entity, strategy, source, adapter, durationMs, fallback }) {
  const entry = {
    layer: 'OCL',
    entity,
    strategy,
    source: source || 'unknown',
    adapter: adapter || null,
    duration_ms: durationMs != null ? Math.round(durationMs) : null,
    fallback: !!fallback
  };
  _push(entry);
  if (process.env.IMPETUS_WMS_OCL_DEBUG === 'true') {
    console.info('[WMS_OCL]', JSON.stringify(entry));
  }
}

function getOclObservabilitySnapshot(limit = 50) {
  return _buffer.slice(-limit);
}

function resetOclObservabilityForTests() {
  _buffer.length = 0;
}

module.exports = {
  logOclResolution,
  getOclObservabilitySnapshot,
  resetOclObservabilityForTests
};
