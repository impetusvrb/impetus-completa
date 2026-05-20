'use strict';

const { adviseRuntimeCalibration } = require('./runtimeCalibrationAdvisor');

function resolveContextualCalibration(ctx = {}) {
  return adviseRuntimeCalibration({
    runtime_entropy_score: ctx.entropy?.runtime_entropy_score,
    runtime_stability: ctx.stability?.runtime_stability,
    drift: ctx.drift,
    cognitive_operational_pressure: ctx.pressure
  });
}

module.exports = { resolveContextualCalibration };
