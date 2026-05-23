'use strict';

const { detectStaleTelemetry } = require('./staleTelemetryDetector');
const { analyzeDegradedSignals } = require('./degradedSignalAnalyzer');
const { resolveTelemetryReadiness } = require('./telemetryReadinessRuntime');
const { computeTelemetryTrustScore } = require('./telemetryTrustScore');

function validateTelemetryHealth(signalBundle = {}, telemetryAgg = {}) {
  const stale = detectStaleTelemetry(signalBundle, telemetryAgg);
  const degraded = analyzeDegradedSignals(signalBundle);
  const readiness = resolveTelemetryReadiness(signalBundle, stale);
  const trust = computeTelemetryTrustScore(signalBundle, stale, degraded);

  return {
    telemetry_health: {
      ready: readiness.ready,
      stale_detected: stale.stale_detected,
      degraded_signals: degraded.degraded_signals,
      trust_score: trust.trust_score,
      sensor_coverage: trust.sensor_coverage,
      readiness: readiness.readiness,
      empty_state: readiness.empty_state,
      stream_integrity: signalBundle.telemetry?.telemetry_integrity || 'unknown',
      invented_telemetry: false
    },
    stale,
    degraded,
    readiness,
    trust
  };
}

module.exports = { validateTelemetryHealth };
