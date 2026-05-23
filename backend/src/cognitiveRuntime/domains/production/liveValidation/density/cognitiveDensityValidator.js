'use strict';

const { detectProductionOverload } = require('./productionOverloadDetector');

function validateCognitiveDensity(consolidated = {}) {
  const overload = detectProductionOverload(consolidated);
  const maxMetrics = Math.max(
    ...(consolidated.centers || []).map((c) => Object.keys(c.metrics || {}).length),
    0
  );
  return {
    density_safe: !overload.overload_detected && maxMetrics <= 8,
    overload,
    max_metrics_per_center: maxMetrics,
    readable: !overload.overload_detected
  };
}

module.exports = { validateCognitiveDensity };
