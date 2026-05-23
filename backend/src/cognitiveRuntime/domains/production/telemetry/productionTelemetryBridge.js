'use strict';

const { loadProductionTenantSignals } = require('../bridge/productionSignalLoader');

async function bridgeProductionTelemetry(user = {}, ctx = {}) {
  const bundle = await loadProductionTenantSignals(user, ctx);
  return {
    bridge: 'production_telemetry_v1',
    ok: bundle.ok === true,
    readiness: bundle.telemetry_readiness || 'empty',
    degradation: bundle.signal_degradation || 'none',
    telemetry: bundle.telemetry || {},
    operational: bundle.operational || {}
  };
}

module.exports = { bridgeProductionTelemetry };
