'use strict';

const _samples = [];

function recordStabilitySample(sample) {
  _samples.push({ ...sample, ts: Date.now() });
  if (_samples.length > 100) _samples.shift();
}

function getStabilityTrend(limit = 20) {
  return _samples.slice(-limit);
}

function clearStabilityMonitor() {
  _samples.length = 0;
}

module.exports = { recordStabilitySample, getStabilityTrend, clearStabilityMonitor };
