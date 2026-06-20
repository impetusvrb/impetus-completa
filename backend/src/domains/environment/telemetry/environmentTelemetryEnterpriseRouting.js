'use strict';

/**
 * M1.19 — Enterprise telemetry routing (TEL-01)
 * Desactiva pilot-only OT quando enterprise routing activo.
 */

const FRESH_FIT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const LAB_TENANT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

function _envBool(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function isEnterpriseTelemetryRoutingActive() {
  return _envBool('IMPETUS_TELEMETRY_ENTERPRISE_ROUTING', false);
}

function resolveOtPilotOnly(envValue, legacyDefault = true) {
  if (isEnterpriseTelemetryRoutingActive()) return false;
  if (envValue == null || envValue === '') return legacyDefault;
  return envValue === 'on' || envValue === 'true' || envValue === '1';
}

function getEnterpriseOtTenants(envList) {
  const base = (envList || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!isEnterpriseTelemetryRoutingActive()) return base;
  const merged = new Set([...base, LAB_TENANT, FRESH_FIT]);
  return [...merged];
}

function getOfficialTelemetryAuditSource() {
  const primary =
    process.env.IMPETUS_ENVIRONMENT_TELEMETRY_PRIMARY_TABLE ||
    process.env.IMPETUS_TELEMETRY_PRIMARY_TABLE ||
    'timeseries';
  return primary === 'industrial' ? 'industrial_telemetry_samples' : 'telemetry_timeseries_v1';
}

function getDiagnostics() {
  return {
    enterprise_telemetry_routing: isEnterpriseTelemetryRoutingActive(),
    official_audit_table: getOfficialTelemetryAuditSource(),
    enterprise_ot_tenants: getEnterpriseOtTenants(
      process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS || process.env.IMPETUS_RLS_PILOT_TENANTS || ''
    ),
  };
}

module.exports = {
  FRESH_FIT,
  LAB_TENANT,
  isEnterpriseTelemetryRoutingActive,
  resolveOtPilotOnly,
  getEnterpriseOtTenants,
  getOfficialTelemetryAuditSource,
  getDiagnostics,
};
