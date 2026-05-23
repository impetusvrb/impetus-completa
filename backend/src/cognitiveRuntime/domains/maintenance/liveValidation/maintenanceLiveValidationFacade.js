'use strict';

const { runReliabilityBoundaryValidator } = require('../governance/maintenanceIsolationRuntime');
const flags = require('../../../config/phaseZM1FeatureFlags');

async function runMaintenanceLiveValidation(user = {}, payload = {}, ctx = {}, opts = {}) {
  if (!flags.isMaintenanceLiveValidationEnabled() && !ctx.force_maintenance_live_validation) {
    return { skipped: true, reason: 'maintenance_live_validation_off' };
  }

  const consolidated = opts.consolidated || {};
  const engine = consolidated.engine_context || {};
  const density = consolidated.density || {};
  const boundary = runReliabilityBoundaryValidator({
    auto_maintenance: consolidated.auto_maintenance,
    auto_shutdown: engine.predictionGov?.auto_shutdown_blocked === false,
    auto_order: engine.predictionGov?.auto_order_blocked === false
  });

  const maintenance_live_validation = {
    telemetry_safe: consolidated.telemetry_readiness !== 'error' && engine.telemetry?.no_invented_telemetry !== false,
    predictive_runtime_stable: engine.predictionGov?.predictive_supervised === true,
    reliability_integrity: engine.reliability?.computed_from_real_data !== false,
    downtime_correlation_valid: engine.downtime?.correlation_valid !== false,
    machine_cognition_valid: engine.health != null && engine.stability != null,
    overload_detected: density.overload_detected === true,
    runtime_safe: boundary.valid && consolidated.auto_action !== true
  };

  return { maintenance_live_validation, ok: Object.values(maintenance_live_validation).every((v) => v !== false) };
}

module.exports = { runMaintenanceLiveValidation };
