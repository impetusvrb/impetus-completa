'use strict';

const _samples = [];

function recordStabilitySample(sample) {
  _samples.unshift({ ts: Date.now(), ...sample });
  if (_samples.length > 100) _samples.length = 100;
}

function getStabilitySnapshot() {
  const recent = _samples.slice(0, 20);
  const okCount = recent.filter((s) => s.ok).length;
  return {
    domain: 'safety',
    samples: recent.length,
    ok_ratio: recent.length ? okCount / recent.length : null
  };
}

module.exports = {
  recordStabilitySample,
  getStabilitySnapshot
};
