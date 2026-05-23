'use strict';

function validateThroughputConsistency(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const produced = op.throughput ?? 0;
  const target = op.target_qty ?? 0;
  const inconsistent = target > 0 && produced > target * 1.15;
  const variance = signalBundle.bottlenecks?.throughput_variance;
  return {
    consistent: !inconsistent,
    throughput: produced,
    target,
    saturation_drift: variance?.unstable === true,
    queue_pressure: signalBundle.bottlenecks?.heatmap?.[0]?.queue_pressure || null
  };
}

module.exports = { validateThroughputConsistency };
