'use strict';

const _samples = [];

function trackOverhead(sample) {
  _samples.push({ ...sample, ts: Date.now() });
  if (_samples.length > 100) _samples.shift();
}

function getOverheadTrend(limit = 15) {
  return _samples.slice(-limit);
}

function clearOverheadTracker() {
  _samples.length = 0;
}

module.exports = { trackOverhead, getOverheadTrend, clearOverheadTracker };
