'use strict';

function detectStaleEnvironmentalSignals(signalBundle = {}) {
  const stale = signalBundle.signal_degradation === 'stale_environmental' || signalBundle.telemetry?.stale_telemetry === true;
  return { stale_detected: stale, reason: stale ? 'stale_environmental' : null };
}

module.exports = { detectStaleEnvironmentalSignals };
