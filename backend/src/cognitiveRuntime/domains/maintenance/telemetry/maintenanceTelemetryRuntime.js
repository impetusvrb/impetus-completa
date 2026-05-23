'use strict';

function runMaintenanceTelemetryRuntime(signals = {}) {
  const op = signals.operational || {};
  const readiness = signals.telemetry_readiness || 'unavailable';
  const degraded = readiness === 'degraded' || readiness === 'error';
  const empty = readiness === 'empty' || readiness === 'unavailable';

  return {
    telemetry_safe: !empty && readiness !== 'error',
    readiness,
    degraded,
    stale: signals.signal_degradation === 'stale_maintenance',
    unavailable: empty,
    machine_signals: {
      vibration: op.vibration_proxy ?? null,
      temperature: op.temperature_proxy ?? null,
      stability_score: op.stability_score ?? null,
      degradation_count: op.degradation_signals ?? 0
    },
    auto_action: false
  };
}

function runMachineHealthRuntime(signals = {}) {
  const op = signals.operational || {};
  const health =
    op.stability_score != null
      ? op.stability_score
      : op.asset_count > 0
        ? Math.max(40, 100 - (op.maintenance_open || 0) * 5 - (op.failure_recurrence === 'elevated' ? 15 : 0))
        : null;

  return {
    asset_health_score: health,
    asset_count: op.asset_count ?? 0,
    critical_assets: op.critical_assets ?? 0,
    maintenance_open: op.maintenance_open ?? 0,
    anomaly_detected: op.failure_recurrence === 'elevated',
    auto_action: false
  };
}

function runDegradationSignalAnalyzer(signals = {}) {
  const op = signals.operational || {};
  const count = op.degradation_signals ?? 0;
  const trend = count > 2 ? 'rising' : count > 0 ? 'stable' : 'none';
  return {
    degradation_detected: count > 0 || op.failure_recurrence === 'elevated',
    trend,
    signal_count: count,
    supervised_only: true,
    auto_action: false
  };
}

function runTelemetryReliabilityRuntime(signals = {}, telemetry = {}) {
  return {
    integrity: telemetry.telemetry_safe !== false,
    readiness: telemetry.readiness || signals.telemetry_readiness,
    no_invented_telemetry: true,
    auto_action: false
  };
}

function runMachineStabilityRuntime(signals = {}) {
  const op = signals.operational || {};
  return {
    stability_score: op.stability_score ?? null,
    instability_risk: op.failure_recurrence === 'elevated' ? 'medium' : 'low',
    downtime_correlation: op.downtime_minutes > 120 ? 'elevated' : 'normal',
    auto_action: false
  };
}

module.exports = {
  runMaintenanceTelemetryRuntime,
  runMachineHealthRuntime,
  runDegradationSignalAnalyzer,
  runTelemetryReliabilityRuntime,
  runMachineStabilityRuntime
};
