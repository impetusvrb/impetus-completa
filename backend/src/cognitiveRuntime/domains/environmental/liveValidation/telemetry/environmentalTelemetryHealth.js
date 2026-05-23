'use strict';

const { detectStaleEnvironmentalSignals } = require('./staleEnvironmentalSignalDetector');
const { analyzeDegradedEnvironmentalRuntime } = require('./degradedEnvironmentalRuntime');
const { computeEnvironmentalTrustScore } = require('./environmentalTrustScore');

function validateEnvironmentalTelemetryHealth(signalBundle = {}) {
  const stale = detectStaleEnvironmentalSignals(signalBundle);
  const degraded = analyzeDegradedEnvironmentalRuntime(signalBundle);
  const trust = computeEnvironmentalTrustScore(signalBundle, stale);
  const op = signalBundle.operational || {};
  return {
    environmental_telemetry_health: {
      ready: signalBundle.telemetry_readiness === 'ready' && !stale.stale_detected,
      stale_detected: stale.stale_detected,
      degraded: degraded.degraded,
      trust_score: trust.trust_score,
      sensor_coverage: trust.sensor_coverage,
      emissions_available: op.emissions_tco2e != null,
      waste_available: op.waste_tonnes != null,
      invented_data: false,
      stream_integrity: signalBundle.telemetry?.telemetry_integrity || 'unknown'
    },
    stale,
    degraded,
    trust
  };
}

module.exports = { validateEnvironmentalTelemetryHealth };
