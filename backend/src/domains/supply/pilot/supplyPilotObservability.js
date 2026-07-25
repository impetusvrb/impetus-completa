'use strict';

const _buffer = [];
const MAX = 400;

function logSupplyPilotEvent(kind, meta = {}) {
  const entry = Object.freeze({
    layer: 'SUPPLY_PILOT',
    kind,
    contract: meta.contract || null,
    endpoint: meta.endpoint || null,
    promotion_origin: meta.promotion_origin || null,
    duration_ms: meta.duration_ms != null ? Math.round(meta.duration_ms) : null,
    rejection: meta.rejection || null,
    incompatible: meta.incompatible === true,
    ts: new Date().toISOString()
  });
  _buffer.push(entry);
  if (_buffer.length > MAX) _buffer.shift();
  return entry;
}

function getSupplyPilotObservabilitySnapshot(limit = 50) {
  return _buffer.slice(-limit);
}

function resetSupplyPilotObservabilityForTests() {
  _buffer.length = 0;
}

module.exports = {
  logSupplyPilotEvent,
  getSupplyPilotObservabilitySnapshot,
  resetSupplyPilotObservabilityForTests
};
