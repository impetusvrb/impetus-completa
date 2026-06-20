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
  isModbusRealEnabled: () => _flag('IMPETUS_MODBUS_REAL_ENABLED', false),
  modbusRealMode: () => _mode('IMPETUS_MODBUS_REAL_MODE', 'shadow'),
  modbusPilotOnly: () => {
    const routing = require('../../domains/environment/telemetry/environmentTelemetryEnterpriseRouting');
    return routing.resolveOtPilotOnly(process.env.IMPETUS_MODBUS_REAL_PILOT_ONLY, true);
  },
  modbusPilotTenants: () => {
    const routing = require('../../domains/environment/telemetry/environmentTelemetryEnterpriseRouting');
    const raw = process.env.IMPETUS_MODBUS_REAL_PILOT_TENANTS
      || process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS
      || process.env.IMPETUS_RLS_PILOT_TENANTS
      || '';
    return routing.getEnterpriseOtTenants(raw);
  },
  defaultHost: () => process.env.IMPETUS_MODBUS_HOST || '127.0.0.1',
  defaultPort: () => parseInt(process.env.IMPETUS_MODBUS_PORT || '502', 10) || 502,
  defaultUnitId: () => parseInt(process.env.IMPETUS_MODBUS_UNIT_ID || '1', 10) || 1,
  pollIntervalMs: () => parseInt(process.env.IMPETUS_MODBUS_POLL_MS || '5000', 10) || 5000,
  bufferMax: () => {
    const v = parseInt(process.env.IMPETUS_MODBUS_BUFFER_MAX || '5000', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 50000) : 5000;
  },
  auditPersistSamples: () => _flag('IMPETUS_MODBUS_REAL_AUDIT_PERSIST', false),
  invariants: Object.freeze({
    simulate_fallback_preserved: true,
    shadow_first: true,
    rollback_safe: true,
    tenant_isolated: true,
  }),
};
