'use strict';

const { loadEnvironmentalTenantSignals } = require('../bridge/environmentalSignalLoader');

async function bridgeEnvironmentalTelemetry(user = {}, ctx = {}) {
  const bundle = await loadEnvironmentalTenantSignals(user, ctx);
  return {
    bridge: 'environmental_telemetry_v1',
    ok: bundle.ok === true,
    readiness: bundle.telemetry_readiness || 'empty',
    degradation: bundle.signal_degradation || 'none',
    telemetry: bundle.telemetry || {},
    operational: bundle.operational || {}
  };
}

module.exports = { bridgeEnvironmentalTelemetry };
