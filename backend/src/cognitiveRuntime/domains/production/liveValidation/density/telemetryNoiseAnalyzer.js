'use strict';

function analyzeTelemetryNoise(signalBundle = {}) {
  const metricsCount = Object.keys(signalBundle.operational || {}).length;
  const noisy = metricsCount > 20;
  return { noisy, metrics_count: metricsCount, toxic_telemetry: noisy && signalBundle.telemetry_readiness === 'degraded' };
}

module.exports = { analyzeTelemetryNoise };
