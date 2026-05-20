'use strict';

const _m = {
  operational_maturity: 0.78,
  rollout_stability: 0.8,
  tenant_stability: 0.82,
  operational_usefulness: 0.79,
  samples: 0
};

function recordCalibrationSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 200);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getCalibrationTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetCalibrationTelemetry() {
  _m.samples = 0;
}

module.exports = { recordCalibrationSample, getCalibrationTelemetry, resetCalibrationTelemetry };
