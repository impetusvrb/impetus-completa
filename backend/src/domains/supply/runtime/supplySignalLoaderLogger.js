'use strict';

const _buffer = [];
const MAX = 300;

function logSupplySignalLoaderEvent(kind, meta = {}) {
  const entry = Object.freeze({
    layer: 'SUPPLY_SEMANTIC_SIGNAL_LOADER',
    kind,
    runtime: meta.runtime || 'supply_native',
    entity: meta.entity || null,
    event: meta.event || null,
    binding: meta.binding != null ? meta.binding : null,
    duration_ms: meta.duration_ms != null ? Math.round(meta.duration_ms) : null,
    origin: meta.origin || null,
    ts: new Date().toISOString()
  });
  _buffer.push(entry);
  if (_buffer.length > MAX) _buffer.shift();
  if (process.env.IMPETUS_SUPPLY_SIGNAL_DEBUG === 'true') {
    console.info('[SUPPLY_SIGNAL_LOADER]', JSON.stringify(entry));
  }
  return entry;
}

function getSupplySignalLoaderLogSnapshot(limit = 50) {
  return _buffer.slice(-limit);
}

function resetSupplySignalLoaderLogForTests() {
  _buffer.length = 0;
}

module.exports = {
  logSupplySignalLoaderEvent,
  getSupplySignalLoaderLogSnapshot,
  resetSupplySignalLoaderLogForTests
};
