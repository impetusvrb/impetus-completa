'use strict';

const flags = require('../environmentTelemetryRuntimeFlags');
const obs = require('../environmentTelemetryObservability');

const _state = { connected: false, last_reconnect: null, buffered: 0, topics: [] };

function getMqttState() {
  return { ..._state, enabled: flags.isEnvironmentTelemetryMqttEnabled() };
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
  return { ok: true, reconnect_completed: true };
}

function simulateDisconnect() {
  _state.connected = false;
  return { ok: true, disconnected: true };
}

module.exports = {
  getMqttState,
  ingestMqttMessage,
  simulateReconnect,
  simulateDisconnect
};
