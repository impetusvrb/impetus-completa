'use strict';

const _ctxHistory = [];

function trackContextualConfidence(score, meta = {}) {
  _ctxHistory.push({ score, ...meta, ts: Date.now() });
  if (_ctxHistory.length > 100) _ctxHistory.shift();
}

function getContextualConfidenceTrend(limit = 15) {
  return _ctxHistory.slice(-limit);
}

function clearContextualConfidenceTracker() {
  _ctxHistory.length = 0;
}

module.exports = { trackContextualConfidence, getContextualConfidenceTrend, clearContextualConfidenceTracker };
