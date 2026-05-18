'use strict';

const flags = require('../environmentTelemetryRuntimeFlags');
const obs = require('../environmentTelemetryObservability');

const _state = { last_poll: null, retries: 0, registers: [] };

function getModbusState() {
  return { ..._state, enabled: flags.isEnvironmentTelemetryModbusEnabled() };
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
    source: 'environment_modbus_connector'
  };
}

async function pollRegisters(companyId, registers, meta = {}, maxRetries = 3) {
  if (!flags.isEnvironmentTelemetryModbusEnabled()) {
    return { ok: false, code: 'MODBUS_OFF' };
  }
  const t0 = Date.now();
  const list = Array.isArray(registers) ? registers : [];
  const samples = [];
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
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
      return { ok: true, samples, latency_ms: Date.now() - t0 };
    } catch {
      _state.retries++;
    }
  }
  return { ok: false, code: 'MODBUS_RETRY_EXHAUSTED', retries: attempt };
}

module.exports = {
  getModbusState,
  convertRegisterToSample,
  pollRegisters
};
