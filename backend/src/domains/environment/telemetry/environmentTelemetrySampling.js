'use strict';

const flags = require('./environmentTelemetryRuntimeFlags');

function shouldPersistSample() {
  const ratio = flags.getEnvironmentTelemetrySampleRatio();
  if (ratio >= 1) return true;
  if (ratio <= 0) return false;
  return Math.random() < ratio;
}

module.exports = { shouldPersistSample };
