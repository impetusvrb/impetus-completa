'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultVal = 'shadow') {
  const v = String(process.env[name] || defaultVal).trim().toLowerCase();
  if (['off', 'shadow', 'audit', 'on'].includes(v)) return v;
  return defaultVal;
}

module.exports = {
  isOpcUaRealEnabled: () => _flag('IMPETUS_OPCUA_REAL_ENABLED', false),
  opcuaRealMode: () => _mode('IMPETUS_OPCUA_REAL_MODE', 'shadow'),
  opcuaPilotOnly: () => {
    const routing = require('../../domains/environment/telemetry/environmentTelemetryEnterpriseRouting');
    return routing.resolveOtPilotOnly(process.env.IMPETUS_OPCUA_REAL_PILOT_ONLY, true);
  },
  opcuaPilotTenants: () => {
    const routing = require('../../domains/environment/telemetry/environmentTelemetryEnterpriseRouting');
    const raw = process.env.IMPETUS_OPCUA_REAL_PILOT_TENANTS
      || process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS
      || process.env.IMPETUS_RLS_PILOT_TENANTS
      || '';
    return routing.getEnterpriseOtTenants(raw);
  },
  defaultEndpointUrl: () => process.env.IMPETUS_OPCUA_ENDPOINT_URL || 'opc.tcp://127.0.0.1:4840/UA/ImpetusLab',
  bufferMax: () => {
    const v = parseInt(process.env.IMPETUS_OPCUA_BUFFER_MAX || '5000', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 50000) : 5000;
  },
  reconnectPeriodMs: () => parseInt(process.env.IMPETUS_OPCUA_RECONNECT_MS || '5000', 10) || 5000,
  connectTimeoutMs: () => parseInt(process.env.IMPETUS_OPCUA_CONNECT_TIMEOUT_MS || '30000', 10) || 30000,
  auditPersistSamples: () => _flag('IMPETUS_OPCUA_REAL_AUDIT_PERSIST', false),
  invariants: Object.freeze({
    simulate_fallback_preserved: true,
    shadow_first: true,
    rollback_safe: true,
    tenant_isolated: true,
  }),
};
