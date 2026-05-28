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
  isEdgeRuntimeRealEnabled: () => _flag('IMPETUS_EDGE_RUNTIME_REAL_ENABLED', false),
  edgeRuntimeMode: () => _mode('IMPETUS_EDGE_RUNTIME_MODE', 'shadow'),
  edgePilotOnly: () => {
    const v = process.env.IMPETUS_EDGE_RUNTIME_PILOT_ONLY;
    if (v == null || v === '') return true;
    return v === 'on' || v === 'true' || v === '1';
  },
  edgePilotTenants: () => {
    const raw = process.env.IMPETUS_EDGE_RUNTIME_PILOT_TENANTS
      || process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS
      || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  persistQueue: () => _flag('IMPETUS_EDGE_RUNTIME_PERSIST_QUEUE', true),
  bufferMax: () => {
    const v = parseInt(process.env.IMPETUS_EDGE_RUNTIME_BUFFER_MAX || '5000', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 50000) : 5000;
  },
  isIndustrialLabEnabled: () => _flag('IMPETUS_INDUSTRIAL_LAB_ENABLED', false),
  labAutoE2eOnBoot: () => _flag('IMPETUS_INDUSTRIAL_LAB_AUTO_E2E_ON_BOOT', false),
  labMqttUrl: () => process.env.IMPETUS_INDUSTRIAL_LAB_MQTT_URL || process.env.IMPETUS_MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883',
  labModbusHost: () => process.env.IMPETUS_INDUSTRIAL_LAB_MODBUS_HOST || process.env.IMPETUS_MODBUS_HOST || '127.0.0.1',
  labModbusPort: () => parseInt(process.env.IMPETUS_INDUSTRIAL_LAB_MODBUS_PORT || process.env.IMPETUS_MODBUS_PORT || '502', 10) || 502,
  labOpcuaUrl: () => process.env.IMPETUS_INDUSTRIAL_LAB_OPCUA_URL || process.env.IMPETUS_OPCUA_ENDPOINT_URL || 'opc.tcp://127.0.0.1:4840/UA/ImpetusLab',
  invariants: Object.freeze({
    memory_queue_preserved: true,
    shadow_first: true,
    rollback_safe: true,
    tenant_isolated: true,
  }),
};
