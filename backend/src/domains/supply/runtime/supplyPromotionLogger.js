'use strict';

const _buffer = [];
const MAX = 400;

function logSupplyPromotionEvent(component, kind, meta = {}) {
  const entry = Object.freeze({
    layer: 'SUPPLY_PROMOTION',
    component,
    kind,
    runtime: meta.runtime || 'supply_native',
    block_id: meta.block_id || null,
    decision: meta.decision || null,
    duration_ms: meta.duration_ms != null ? Math.round(meta.duration_ms) : null,
    ts: new Date().toISOString()
  });
  _buffer.push(entry);
  if (_buffer.length > MAX) _buffer.shift();
  if (process.env.IMPETUS_SUPPLY_PROMOTION_DEBUG === 'true') {
    console.info('[SUPPLY_PROMOTION]', JSON.stringify(entry));
  }
  return entry;
}

function getSupplyPromotionLogSnapshot(limit = 50) {
  return _buffer.slice(-limit);
}

function resetSupplyPromotionLogForTests() {
  _buffer.length = 0;
}

module.exports = {
  logSupplyPromotionEvent,
  getSupplyPromotionLogSnapshot,
  resetSupplyPromotionLogForTests
};
