'use strict';

const flags = require('../environmentTelemetryRuntimeFlags');
const obs = require('../environmentTelemetryObservability');

const _state = { connected: false, subscriptions: [], last_reconnect: null, real_runtime: false };

function _realRuntime() {
  try {
    return require('../../../../industrial-opcua/runtime/opcuaRealClientRuntime');
  } catch {
    return null;
  }
}

function _realGov() {
  try {
    return require('../../../../industrial-opcua/governance/opcuaGovernanceService');
  } catch {
    return null;
  }
}

function getOpcUaState() {
  const base = { ..._state, enabled: flags.isEnvironmentTelemetryOpcUaEnabled() };
  const real = _realRuntime();
  const rg = _realGov();
  try {
    const opcuaFlags = require('../../../../industrial-opcua/config/opcuaRealFlags');
    if (real && opcuaFlags.isOpcUaRealEnabled() && rg) {
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
    source: 'environment_opcua_connector',
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
  return { ok: true, reconnect_completed: true, simulation: true };
}

function simulateDisconnect() {
  _state.connected = false;
  return { ok: true, disconnected: true, simulation: true };
}

/**
 * Reconnect unificado — servidor OPC-UA real se IMPETUS_OPCUA_REAL_ENABLED + modo audit/on.
 */
async function reconnect(companyId) {
  const rg = _realGov();
  const real = _realRuntime();
  if (companyId && real && rg?.isActiveForTenant?.(companyId)) {
    const config = await (async () => {
      try {
        const svc = require('../../../../industrial-opcua/services/opcuaServerConfigService');
        return svc.getServerConfig(companyId);
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
  getOpcUaState,
  normalizeOpcUaNode,
  ingestSubscriptionSample,
  simulateReconnect,
  simulateDisconnect,
  reconnect,
  disconnect,
};
