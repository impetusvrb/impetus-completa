'use strict';

let _snapshot = _empty();

function _empty() {
  return {
    blocks_received: 0,
    blocks_promoted: 0,
    blocks_rejected: 0,
    total_duration_ms: 0,
    runs: 0
  };
}

function recordPromotionRun({ blocks_received = 0, blocks_promoted = 0, blocks_rejected = 0, duration_ms = 0 }) {
  _snapshot.blocks_received += blocks_received;
  _snapshot.blocks_promoted += blocks_promoted;
  _snapshot.blocks_rejected += blocks_rejected;
  _snapshot.total_duration_ms += duration_ms;
  _snapshot.runs += 1;
}

function getPromotionMetricsSnapshot() {
  const runs = _snapshot.runs || 0;
  const received = _snapshot.blocks_received;
  const promoted = _snapshot.blocks_promoted;
  const rejected = _snapshot.blocks_rejected;
  const decided = promoted + rejected;
  return Object.freeze({
    blocks_received: received,
    blocks_promoted: promoted,
    blocks_rejected: rejected,
    avg_duration_ms: runs === 0 ? 0 : Math.round(_snapshot.total_duration_ms / runs),
    promotion_success_rate: decided === 0 ? 0 : Math.round((promoted / decided) * 1000) / 1000,
    promotion_failure_rate: decided === 0 ? 0 : Math.round((rejected / decided) * 1000) / 1000,
    runs
  });
}

function resetPromotionMetricsForTests() {
  _snapshot = _empty();
}

module.exports = {
  recordPromotionRun,
  getPromotionMetricsSnapshot,
  resetPromotionMetricsForTests
};
