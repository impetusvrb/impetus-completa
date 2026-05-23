'use strict';

function resolveTelemetryReadiness(signalBundle = {}, stale = {}) {
  const readiness = signalBundle.telemetry_readiness || 'empty';
  const ready = readiness === 'ready' && !stale.stale_detected && signalBundle.ok !== false;
  return {
    readiness,
    ready,
    empty_state: readiness === 'empty',
    degraded: readiness === 'degraded' || readiness === 'error',
    temporal_consistency: stale.stale_detected ? 'stale' : readiness === 'ready' ? 'ok' : 'unknown'
  };
}

module.exports = { resolveTelemetryReadiness };
