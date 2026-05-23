'use strict';

function validateTelemetryRuntimeStability(healthA = {}, healthB = {}) {
  return {
    telemetry_stable: healthA.trust_score === healthB.trust_score && healthA.stale_detected === healthB.stale_detected,
    trust_delta: Math.abs((healthA.trust_score || 0) - (healthB.trust_score || 0))
  };
}

module.exports = { validateTelemetryRuntimeStability };
