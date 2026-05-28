'use strict';

/**
 * WAVE 2 — flags de observabilidade enterprise (defaults seguros).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envInt(name, defaultValue, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isObservabilityV2Enabled() {
  return envBool('IMPETUS_OBSERVABILITY_V2_ENABLED', false);
}

function isWorkflowTracingEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_WORKFLOW_TRACING_ENABLED', false);
}

function isCorrelationPropagationEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_CORRELATION_PROPAGATION_ENABLED', false);
}

function isOtelExporterEnabled() {
  return (
    isObservabilityV2Enabled() &&
    envBool('IMPETUS_OTEL_EXPORTER_ENABLED', false) &&
    String(process.env.IMPETUS_OTEL_ENDPOINT || '').trim().length > 0
  );
}

function otelEndpoint() {
  return String(process.env.IMPETUS_OTEL_ENDPOINT || '').trim().replace(/\/$/, '');
}

function isPrometheusEndpointEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_PROMETHEUS_ENDPOINT_ENABLED', false);
}

function isSloMonitoringEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_SLO_MONITORING_ENABLED', false);
}

function isSaturationMonitoringEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_SATURATION_MONITORING_ENABLED', false);
}

function isEventLagMonitoringEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_EVENT_LAG_MONITORING_ENABLED', false);
}

function isDlqMonitoringEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_DLQ_MONITORING_ENABLED', false);
}

function isCognitivePressureObservabilityEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_COGNITIVE_PRESSURE_OBS_ENABLED', false);
}

function isWorkflowObservabilityEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_WORKFLOW_OBSERVABILITY_ENABLED', false);
}

function tenantMetricsCardinalityCap() {
  return envInt('IMPETUS_TENANT_METRICS_CARDINALITY_CAP', 25, 5, 200);
}

function otelExportIntervalMs() {
  return envInt('IMPETUS_OTEL_EXPORT_INTERVAL_MS', 15000, 5000, 120000);
}

function otelExportBatchSize() {
  return envInt('IMPETUS_OTEL_EXPORT_BATCH_SIZE', 50, 10, 200);
}

function isAlertsObserveOnly() {
  return process.env.IMPETUS_OBSERVABILITY_ALERTS_ENFORCE !== 'true';
}

/** PROMPT 14 — APM enterprise (requer V2) */
function isApmEnterpriseEnabled() {
  return isObservabilityV2Enabled() && envBool('IMPETUS_APM_ENTERPRISE_ENABLED', false);
}

function isApmShadowMode() {
  if (!isApmEnterpriseEnabled()) return true;
  const mode = String(process.env.IMPETUS_APM_ENTERPRISE_MODE || 'shadow').trim().toLowerCase();
  if (mode === 'enforce' || mode === 'audit') return false;
  return envBool('IMPETUS_APM_SHADOW_MODE', true);
}

function apmSamplingRate() {
  const raw = Number(process.env.IMPETUS_APM_SAMPLING_RATE);
  if (!Number.isFinite(raw)) {
    return isApmShadowMode() ? 0.1 : 0.25;
  }
  return Math.min(1, Math.max(0.01, raw));
}

function isGrafanaProvisioningEnabled() {
  return envBool('IMPETUS_GRAFANA_STACK_ENABLED', false);
}

module.exports = {
  envBool,
  envInt,
  isObservabilityV2Enabled,
  isWorkflowTracingEnabled,
  isCorrelationPropagationEnabled,
  isOtelExporterEnabled,
  otelEndpoint,
  isPrometheusEndpointEnabled,
  isSloMonitoringEnabled,
  isSaturationMonitoringEnabled,
  isEventLagMonitoringEnabled,
  isDlqMonitoringEnabled,
  isCognitivePressureObservabilityEnabled,
  isWorkflowObservabilityEnabled,
  tenantMetricsCardinalityCap,
  otelExportIntervalMs,
  otelExportBatchSize,
  isAlertsObserveOnly,
  isApmEnterpriseEnabled,
  isApmShadowMode,
  apmSamplingRate,
  isGrafanaProvisioningEnabled
};
