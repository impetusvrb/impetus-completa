'use strict';

const flags = require('../environmentTelemetryRuntimeFlags');
const obs = require('../environmentTelemetryObservability');

const _state = { connected: false, subscriptions: [], last_reconnect: null };

function getOpcUaState() {
  return { ..._state, enabled: flags.isEnvironmentTelemetryOpcUaEnabled() };
}

function normalizeOpcUaNode(nodeId, value, meta = {}) {
  const t0 = Date.now();
  const sampleBody = {
    metric_key: meta.metric_key || `opcua.${String(nodeId).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)}`,
    value,
    unit: meta.unit,
    environmental_area: meta.environmental_area || 'utilities',
    telemetry_type: meta.telemetry_type || 'generic',
    telemetry_source: 'opcua',
    labels: { opcua_node: String(nodeId).slice(0, 256), ...(meta.labels || {}) },
    recorded_at: meta.recorded_at,
    source: 'environment_opcua_connector'
  };
  obs.record('environment_opcua_latency_ms', Date.now() - t0, {});
  return sampleBody;
}

function ingestSubscriptionSample(companyId, nodeId, value, meta) {
  if (!flags.isEnvironmentTelemetryOpcUaEnabled()) {
    return { ok: false, code: 'OPCUA_OFF' };
  }
  if (!_state.connected) {
    _state.connected = true;
    _state.last_reconnect = new Date().toISOString();
  }
  const sub = String(nodeId).slice(0, 128);
  if (!_state.subscriptions.includes(sub)) _state.subscriptions.push(sub);
  return { ok: true, sampleBody: normalizeOpcUaNode(nodeId, value, meta) };
}

function simulateReconnect() {
  _state.connected = true;
  _state.last_reconnect = new Date().toISOString();
  return { ok: true };
}

module.exports = {
  getOpcUaState,
  normalizeOpcUaNode,
  ingestSubscriptionSample,
  simulateReconnect
};
