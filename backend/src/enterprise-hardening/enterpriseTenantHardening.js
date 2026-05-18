'use strict';

const { clamp01, pressureScore } = require('./shared/hardeningHelpers');

function enterpriseTenantTelemetryIsolationRuntime(tenantId) {
  return { tenant_id: tenantId, telemetry_isolated: true, observability_partitioned: true };
}

function enterpriseTenantObservabilityIsolationRuntime(tenantId) {
  return { tenant_id: tenantId, metric_cardinality_cap: 500, isolated: true };
}

function enterpriseTenantPressureRuntime(ctx = {}) {
  const tenants = Number(ctx.active_tenants) || 1;
  const telemetry = Number(ctx.telemetry_points_per_tenant) || 0;
  const memory = Number(ctx.memory_growth_mb) || 0;
  const pressure = pressureScore([
    { value: tenants / 200, weight: 1 },
    { value: telemetry / 10000, weight: 1 },
    { value: memory / 512, weight: 0.8 }
  ]);
  return {
    tenant_pressure: pressure,
    saturation_risk: pressure > 0.75,
    contextual_overload: pressure > 0.85
  };
}

function enterpriseTenantHardeningRuntime(ctx = {}) {
  const tenantId = ctx.tenant_id || null;
  const pressure = enterpriseTenantPressureRuntime(ctx);
  return {
    ok: !pressure.saturation_risk,
    telemetry: enterpriseTenantTelemetryIsolationRuntime(tenantId),
    observability: enterpriseTenantObservabilityIsolationRuntime(tenantId),
    pressure,
    rollout_pressure_safe: pressure.tenant_pressure < 0.8,
    assistive_only: true
  };
}

module.exports = {
  enterpriseTenantHardeningRuntime,
  enterpriseTenantPressureRuntime,
  enterpriseTenantTelemetryIsolationRuntime,
  enterpriseTenantObservabilityIsolationRuntime
};
