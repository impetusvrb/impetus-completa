'use strict';

function analyzeDegradedEnvironmentalRuntime(signalBundle = {}) {
  const degraded = signalBundle.telemetry_readiness === 'degraded' || signalBundle.telemetry_readiness === 'error';
  return {
    degraded,
    signal_loss: signalBundle.ok === false,
    inconsistent: degraded && signalBundle.telemetry_readiness === 'ready'
  };
}

module.exports = { analyzeDegradedEnvironmentalRuntime };
