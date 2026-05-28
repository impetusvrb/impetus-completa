'use strict';

const flags = require('../environmentTelemetryRuntimeFlags');
const obs = require('../environmentTelemetryObservability');

const _state = { connected: false, last_reconnect: null, buffered: 0, topics: [], real_runtime: false };

function _realRuntime() {
  try {
    return require('../../../../industrial-mqtt/runtime/mqttRealClientRuntime');
  } catch {
    return null;
  }
}

function _realGov() {
  try {
    return require('../../../../industrial-mqtt/governance/mqttGovernanceService');
  } catch {
    return null;
  }
}

function getMqttState() {
  const base = { ..._state, enabled: flags.isEnvironmentTelemetryMqttEnabled() };
  const real = _realRuntime();
  const rg = _realGov();
  try {
    const mqttFlags = require('../../../../industrial-mqtt/config/mqttRealFlags');
    if (real && mqttFlags.isMqttRealEnabled() && rg) {
      const pilots = rg.getDiagnostics().pilot_tenants || [];
      const pilotStats = pilots.map((id) => real.getClientStats(id));
      return {
        ...base,
        real_runtime: true,
        real_mode: rg.getDiagnostics().mode,
        global_stats: real.getGlobalStats(),
        pilot_clients: pilotStats,
      };
    }
  } catch { /* optional */ }
  return base;
}

/**
 * Simulação shadow — normaliza payload MQTT para amostra ambiental.
 */
function ingestMqttMessage(companyId, topic, payload) {
  if (!flags.isEnvironmentTelemetryMqttEnabled()) {
    return { ok: false, code: 'MQTT_OFF' };
  }
  const t0 = Date.now();
  const p = payload && typeof payload === 'object' ? payload : {};
  const sampleBody = {
    metric_key: p.metric_key || `mqtt.${String(topic).replace(/\//g, '.').slice(0, 120)}`,
    value: p.value != null ? p.value : 0,
    unit: p.unit,
    environmental_area: p.environmental_area || 'field',
    telemetry_type: p.telemetry_type || 'generic',
    telemetry_source: 'mqtt',
    labels: { mqtt_topic: String(topic).slice(0, 256), ...(p.labels || {}) },
    recorded_at: p.recorded_at,
    source: 'environment_mqtt_connector'
  };
  _state.buffered = Math.min(_state.buffered + 1, 10000);
  obs.record('environment_mqtt_latency_ms', Date.now() - t0, { topic: String(topic).slice(0, 32) });
  if (!_state.connected) {
    _state.connected = true;
    _state.last_reconnect = new Date().toISOString();
  }
  if (!_state.topics.includes(topic)) _state.topics.push(String(topic).slice(0, 128));
  return { ok: true, sampleBody, latency_ms: Date.now() - t0 };
}

function simulateReconnect() {
  _state.connected = true;
  _state.last_reconnect = new Date().toISOString();
  _state.buffered = 0;
  return { ok: true, reconnect_completed: true, simulation: true };
}

function simulateDisconnect() {
  _state.connected = false;
  return { ok: true, disconnected: true, simulation: true };
}

/**
 * Reconnect unificado — real broker se IMPETUS_MQTT_REAL_ENABLED + modo audit/on; senão simulação legada.
 */
async function reconnect(companyId) {
  const rg = _realGov();
  const real = _realRuntime();
  if (companyId && real && rg?.isActiveForTenant?.(companyId)) {
    const config = await (async () => {
      try {
        const svc = require('../../../../industrial-mqtt/services/mqttBrokerConfigService');
        return svc.getBrokerConfig(companyId);
      } catch {
        return null;
      }
    })();
    const mode = rg.getEffectiveMode(config?.mode);
    if (rg.shouldConnectReal(mode)) {
      const r = await real.reconnect(companyId);
      _state.connected = r.ok === true;
      _state.last_reconnect = new Date().toISOString();
      _state.real_runtime = true;
      return { ...r, reconnect_completed: r.ok, real: true };
    }
  }
  return simulateReconnect();
}

async function disconnect(companyId) {
  const real = _realRuntime();
  if (companyId && real) {
    const r = await real.stopClient(companyId);
    _state.connected = false;
    return { ...r, real: true };
  }
  return simulateDisconnect();
}

module.exports = {
  getMqttState,
  ingestMqttMessage,
  simulateReconnect,
  simulateDisconnect,
  reconnect,
  disconnect,
};
