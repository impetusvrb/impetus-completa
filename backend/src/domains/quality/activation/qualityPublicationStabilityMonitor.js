'use strict';

const RING = [];
const RING_MAX = 50;

function recordStabilitySample(sample) {
  RING.push({
    ts: Date.now(),
    ...sample
  });
  if (RING.length > RING_MAX) RING.shift();
}

function getStabilitySnapshot() {
  if (RING.length === 0) return { ok: true, samples: 0, last_failure_rate: 0 };
  const fails = RING.filter((s) => s.ok === false).length;
  return {
    ok: fails < RING.length * 0.25,
    samples: RING.length,
    last_failure_rate: fails / RING.length
  };
}

module.exports = { recordStabilitySample, getStabilitySnapshot };
