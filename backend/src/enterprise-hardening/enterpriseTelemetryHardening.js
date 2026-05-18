'use strict';

const { clamp01, pressureScore } = require('./shared/hardeningHelpers');

function enterpriseTelemetryOverloadProtection(ctx = {}) {
  const rate = Number(ctx.event_rate_per_min) || 0;
  const burst = Number(ctx.burst_factor) || 1;
  const overload = rate > 120 || burst > 3;
  return { overload, rate, burst, protected: overload, action: overload ? 'throttle_sampling' : 'none' };
}

function enterpriseTelemetryAdaptiveSampling(ctx = {}) {
  const overload = enterpriseTelemetryOverloadProtection(ctx);
  const ratio = overload.overload ? Math.max(0.1, 1 - ctx.pressure || 0.5) : 1;
  return { sample_ratio: clamp01(ratio), adaptive: true, assistive_only: true };
}

function enterpriseTelemetryBurstProtection(ctx = {}) {
  const window = Number(ctx.window_events) || 0;
  return { burst_detected: window > 500, window, capped: window > 500 };
}

function enterpriseTelemetryReplayProtection(ctx = {}) {
  const replays = Number(ctx.replay_count) || 0;
  const dup = Number(ctx.duplicate_ratio) || 0;
  return {
    replay_storm: replays > 50,
    duplicate_risk: dup > 0.15,
    integrity_ok: replays <= 50 && dup <= 0.15,
    assistive_only: true
  };
}

function enterpriseTelemetryIsolationRuntime(tenantId) {
  return {
    tenant_id: tenantId,
    isolated: true,
    domains: ['quality', 'safety', 'logistics', 'environment'],
    memory_protected: true
  };
}

function enterpriseTelemetryResilienceRuntime(ctx = {}) {
  const mqtt = Number(ctx.mqtt_rate) || 0;
  const opcua = Number(ctx.opcua_rate) || 0;
  const modbus = Number(ctx.modbus_rate) || 0;
  const pressure = pressureScore([
    { value: mqtt / 200, weight: 1 },
    { value: opcua / 150, weight: 1 },
    { value: modbus / 100, weight: 0.8 }
  ]);
  return {
    ok: pressure < 0.85,
    ingestion_resilient: pressure < 0.9,
    telemetry_pressure_score: pressure,
    protocol_pressure: { mqtt, opcua, modbus },
    collapse_risk: pressure >= 0.92
  };
}

function enterpriseTelemetryHardeningRuntime(ctx = {}) {
  const overload = enterpriseTelemetryOverloadProtection(ctx);
  const sampling = enterpriseTelemetryAdaptiveSampling({ ...ctx, pressure: overload.rate / 200 });
  const burst = enterpriseTelemetryBurstProtection(ctx);
  const replay = enterpriseTelemetryReplayProtection(ctx);
  const isolation = enterpriseTelemetryIsolationRuntime(ctx.tenant_id);
  const resilience = enterpriseTelemetryResilienceRuntime(ctx);
  return {
    ok: !overload.overload && replay.integrity_ok && resilience.ok,
    overload,
    sampling,
    burst,
    replay,
    isolation,
    resilience,
    assistive_only: true
  };
}

module.exports = {
  enterpriseTelemetryOverloadProtection,
  enterpriseTelemetryAdaptiveSampling,
  enterpriseTelemetryBurstProtection,
  enterpriseTelemetryReplayProtection,
  enterpriseTelemetryIsolationRuntime,
  enterpriseTelemetryResilienceRuntime,
  enterpriseTelemetryHardeningRuntime
};
