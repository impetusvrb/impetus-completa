'use strict';

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

function isSafetyTelemetryRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_TELEMETRY_RUNTIME_ENABLED);
}

module.exports = { isSafetyTelemetryRuntimeEnabled };
