'use strict';

const { observeProductionRuntime } = require('./governanceObservationRuntime');
const { computeStabilizationMetrics } = require('./governanceStabilizationMonitor');
const { getTelemetry } = require('./governanceProductionTelemetry');

function getOperationalObservation(ctx = {}) {
  const runtime = observeProductionRuntime(ctx);
  const stabilization = computeStabilizationMetrics(ctx);
  const telemetry = getTelemetry(50);

  return {
    runtime,
    stabilization,
    telemetry,
    auto_activation: false,
    global_governance_active: false
  };
}

module.exports = { getOperationalObservation };
