'use strict';

function resolveEmissionsTelemetry(signalBundle = {}) {
  const op = signalBundle.operational || {};
  return {
    tco2e: op.emissions_tco2e,
    available: op.emissions_tco2e != null,
    empty_state: op.emissions_tco2e == null && signalBundle.telemetry_readiness === 'empty'
  };
}

module.exports = { resolveEmissionsTelemetry };
