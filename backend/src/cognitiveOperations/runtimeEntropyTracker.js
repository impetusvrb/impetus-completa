'use strict';

const _samples = [];

function trackEntropy(sample) {
  _samples.push({ ...sample, ts: Date.now() });
  if (_samples.length > 200) _samples.shift();
  return sample;
}

function getEntropyTrend(limit = 20) {
  return _samples.slice(-limit);
}

function clearEntropyTracker() {
  _samples.length = 0;
}

module.exports = { trackEntropy, getEntropyTrend, clearEntropyTracker };
