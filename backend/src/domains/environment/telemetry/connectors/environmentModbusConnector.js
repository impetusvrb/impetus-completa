'use strict';

const flags = require('../environmentTelemetryRuntimeFlags');
const obs = require('../environmentTelemetryObservability');

const _state = { last_poll: null, retries: 0, registers: [], real_runtime: false };

function _realRuntime() {
  try {
    return require('../../../../industrial-modbus/runtime/modbusRealPollRuntime');
  } catch {
    return null;
  }
}

function _realGov() {
  try {
    return require('../../../../industrial-modbus/governance/modbusGovernanceService');
  } catch {
    return null;
  }
}

function getModbusState() {
  const base = { ..._state, enabled: flags.isEnvironmentTelemetryModbusEnabled() };
  const real = _realRuntime();
  const rg = _realGov();
  try {
    const modbusFlags = require('../../../../industrial-modbus/config/modbusRealFlags');
    if (real && modbusFlags.isModbusRealEnabled() && rg) {
      const pilots = rg.getDiagnostics().pilot_tenants || [];
      const pilotStats = pilots.map((id) => real.getPollerStats(id));
      return {
        ...base,
        real_runtime: true,
        real_mode: rg.getDiagnostics().mode,
        global_stats: real.getGlobalStats(),
        pilot_pollers: pilotStats,
      };
    }
  } catch { /* optional */ }
  return base;
}

function convertRegisterToSample(register, rawValue, meta = {}) {
  const scale = Number(meta.scale) || 1;
  const offset = Number(meta.offset) || 0;
  const value = Number(rawValue) * scale + offset;
  return {
    metric_key: meta.metric_key || `modbus.reg_${register}`,
    value,
    unit: meta.unit,
    environmental_area: meta.environmental_area || 'utilities',
    telemetry_type: meta.telemetry_type || 'generic',
    telemetry_source: 'modbus_tcp',
    labels: { modbus_register: String(register), ...(meta.labels || {}) },
    recorded_at: meta.recorded_at,
    source: 'environment_modbus_connector',
  };
}

async function _simulatePollRegisters(companyId, registers, meta, maxRetries) {
  const t0 = Date.now();
  const list = Array.isArray(registers) ? registers : [];
  const samples = [];
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt += 1;
    try {
      for (const reg of list.slice(0, 64)) {
        const raw = reg.raw_value != null ? reg.raw_value : 0;
        samples.push(convertRegisterToSample(reg.address || reg.register || '0', raw, { ...meta, ...reg }));
        const key = String(reg.address || reg.register);
        if (!_state.registers.includes(key)) _state.registers.push(key);
      }
      _state.last_poll = new Date().toISOString();
      _state.retries = 0;
      obs.record('environment_modbus_latency_ms', Date.now() - t0, { n: String(samples.length) });
      return { ok: true, samples, latency_ms: Date.now() - t0, simulation: true };
    } catch {
      _state.retries += 1;
    }
  }
  return { ok: false, code: 'MODBUS_RETRY_EXHAUSTED', retries: attempt, simulation: true };
}

async function pollRegisters(companyId, registers, meta = {}, maxRetries = 3) {
  if (!flags.isEnvironmentTelemetryModbusEnabled()) {
    return { ok: false, code: 'MODBUS_OFF' };
  }

  const rg = _realGov();
  const real = _realRuntime();
  if (companyId && real && rg?.isActiveForTenant?.(companyId)) {
    const config = await (async () => {
      try {
        const svc = require('../../../../industrial-modbus/services/modbusDeviceConfigService');
        return svc.getDeviceConfig(companyId);
      } catch {
        return null;
      }
    })();
    const mode = rg.getEffectiveMode(config?.mode);
    if (rg.shouldPollReal(mode)) {
      const r = await real.pollRegisters(companyId, registers, meta, maxRetries);
      if (r.ok) {
        _state.last_poll = new Date().toISOString();
        _state.real_runtime = true;
        for (const s of r.samples || []) {
          const key = String(s.address);
          if (!_state.registers.includes(key)) _state.registers.push(key);
        }
      }
      return r;
    }
  }

  return _simulatePollRegisters(companyId, registers, meta, maxRetries);
}

function simulateReconnect() {
  _state.last_poll = new Date().toISOString();
  _state.retries = 0;
  return { ok: true, reconnect_completed: true, simulation: true };
}

function simulateDisconnect() {
  _state.registers = [];
  return { ok: true, disconnected: true, simulation: true };
}

async function reconnect(companyId) {
  const rg = _realGov();
  const real = _realRuntime();
  if (companyId && real && rg?.isActiveForTenant?.(companyId)) {
    const config = await (async () => {
      try {
        const svc = require('../../../../industrial-modbus/services/modbusDeviceConfigService');
        return svc.getDeviceConfig(companyId);
      } catch {
        return null;
      }
    })();
    const mode = rg.getEffectiveMode(config?.mode);
    if (rg.shouldPollReal(mode)) {
      const r = await real.reconnect(companyId);
      _state.real_runtime = true;
      return { ...r, reconnect_completed: r.ok, real: true };
    }
  }
  return simulateReconnect();
}

async function disconnect(companyId) {
  const real = _realRuntime();
  if (companyId && real) {
    const r = await real.stopPoller(companyId);
    return { ...r, real: true };
  }
  return simulateDisconnect();
}

module.exports = {
  getModbusState,
  convertRegisterToSample,
  pollRegisters,
  simulateReconnect,
  simulateDisconnect,
  reconnect,
  disconnect,
};
