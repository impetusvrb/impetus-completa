'use strict';

/**
 * Etapa 3 — Environment Industrial Telemetry Runtime.
 * Aditivo; defaults seguros (desligado). Shadow-first.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envFloat(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : defaultValue;
}

function envInt(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function envStr(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  return String(raw).trim().toLowerCase();
}

function isEnvironmentTelemetryRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED', false);
}

function isEnvironmentTelemetryBackboneEventsEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_BACKBONE_EVENTS_ENABLED', false);
}

function isEnvironmentTelemetryThresholdEventsEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_THRESHOLD_EVENTS_ENABLED', true);
}

function isEnvironmentTelemetryDriftEventsEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_DRIFT_EVENTS_ENABLED', false);
}

function isEnvironmentTelemetryEdgeRuntimeEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED', false);
}

function isEnvironmentTelemetryMqttEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED', false);
}

function isEnvironmentTelemetryOpcUaEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_OPCUA_ENABLED', false);
}

function isEnvironmentTelemetryModbusEnabled() {
  return isEnvironmentTelemetryRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_TELEMETRY_MODBUS_ENABLED', false);
}

function getEnvironmentTelemetrySampleRatio() {
  const r = envFloat('IMPETUS_ENVIRONMENT_TELEMETRY_SAMPLE_RATIO', 1);
  if (r >= 1) return 1;
  if (r <= 0) return 0;
  return r;
}

function getEnvironmentTelemetryBatchMax() {
  const m = envInt('IMPETUS_ENVIRONMENT_TELEMETRY_BATCH_MAX', 200);
  if (m < 1) return 1;
  if (m > 2000) return 2000;
  return m;
}

function getEnvironmentTelemetryPrimaryPersistence() {
  const p = envStr('IMPETUS_ENVIRONMENT_TELEMETRY_PRIMARY_TABLE', 'timeseries');
  if (p === 'industrial') return 'industrial';
  return 'timeseries';
}

function getEnvironmentTelemetryEdgeBufferMax() {
  const m = envInt('IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_BUFFER_MAX', 5000);
  if (m < 100) return 100;
  if (m > 50000) return 50000;
  return m;
}

function getTelemetryRuntimeFlagSnapshot() {
  return {
    telemetry_runtime: isEnvironmentTelemetryRuntimeEnabled(),
    backbone_events: isEnvironmentTelemetryBackboneEventsEnabled(),
    threshold_events: isEnvironmentTelemetryThresholdEventsEnabled(),
    drift_events: isEnvironmentTelemetryDriftEventsEnabled(),
    edge_runtime: isEnvironmentTelemetryEdgeRuntimeEnabled(),
    mqtt: isEnvironmentTelemetryMqttEnabled(),
    opcua: isEnvironmentTelemetryOpcUaEnabled(),
    modbus: isEnvironmentTelemetryModbusEnabled(),
    sample_ratio: getEnvironmentTelemetrySampleRatio(),
    batch_max: getEnvironmentTelemetryBatchMax(),
    primary_table: getEnvironmentTelemetryPrimaryPersistence(),
    edge_buffer_max: getEnvironmentTelemetryEdgeBufferMax(),
    outbox_validation: require('./environmentTelemetryOutboxMode').getOutboxModeSnapshot()
  };
}

module.exports = {
  isEnvironmentTelemetryRuntimeEnabled,
  isEnvironmentTelemetryBackboneEventsEnabled,
  isEnvironmentTelemetryThresholdEventsEnabled,
  isEnvironmentTelemetryDriftEventsEnabled,
  isEnvironmentTelemetryEdgeRuntimeEnabled,
  isEnvironmentTelemetryMqttEnabled,
  isEnvironmentTelemetryOpcUaEnabled,
  isEnvironmentTelemetryModbusEnabled,
  getEnvironmentTelemetrySampleRatio,
  getEnvironmentTelemetryBatchMax,
  getEnvironmentTelemetryPrimaryPersistence,
  getEnvironmentTelemetryEdgeBufferMax,
  getTelemetryRuntimeFlagSnapshot
};
