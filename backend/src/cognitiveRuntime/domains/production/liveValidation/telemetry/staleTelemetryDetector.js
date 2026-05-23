'use strict';

function detectStaleTelemetry(signalBundle = {}, telemetryAgg = {}) {
  const stale = telemetryAgg.stale_telemetry === true || signalBundle.signal_degradation === 'stale_shift_data';
  const lastSignal = signalBundle.loaded_at ? new Date(signalBundle.loaded_at).getTime() : 0;
  const ageMs = lastSignal ? Date.now() - lastSignal : null;
  return {
    stale_detected: stale,
    age_ms: ageMs,
    reason: stale ? 'stale_shift_data' : signalBundle.telemetry_readiness === 'empty' ? 'no_data' : null
  };
}

module.exports = { detectStaleTelemetry };
