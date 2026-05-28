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
  isMqttRealEnabled: () => _flag('IMPETUS_MQTT_REAL_ENABLED', false),
  mqttRealMode: () => _mode('IMPETUS_MQTT_REAL_MODE', 'shadow'),
  mqttPilotOnly: () => {
    const v = process.env.IMPETUS_MQTT_REAL_PILOT_ONLY;
    if (v == null || v === '') return true;
    return v === 'on' || v === 'true' || v === '1';
  },
  mqttPilotTenants: () => {
    const raw = process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS || process.env.IMPETUS_RLS_PILOT_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  defaultBrokerUrl: () => process.env.IMPETUS_MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883',
  bufferMax: () => {
    const v = parseInt(process.env.IMPETUS_MQTT_BUFFER_MAX || '5000', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 50000) : 5000;
  },
  reconnectPeriodMs: () => parseInt(process.env.IMPETUS_MQTT_RECONNECT_MS || '5000', 10) || 5000,
  auditPersistSamples: () => _flag('IMPETUS_MQTT_REAL_AUDIT_PERSIST', false),
  invariants: Object.freeze({
    simulate_fallback_preserved: true,
    shadow_first: true,
    rollback_safe: true,
    tenant_isolated: true,
  }),
};
