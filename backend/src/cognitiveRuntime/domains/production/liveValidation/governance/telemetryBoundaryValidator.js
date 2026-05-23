'use strict';

function validateTelemetryBoundary(signalBundle = {}) {
  return {
    boundary_ok: signalBundle.invented_telemetry !== true,
    graceful_empty: signalBundle.telemetry_readiness === 'empty' && signalBundle.ok !== false,
    masked_absence: false
  };
}

module.exports = { validateTelemetryBoundary };
