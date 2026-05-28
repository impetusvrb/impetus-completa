'use strict';

const ModbusRTU = require('modbus-serial');
const gov = require('../governance/modbusGovernanceService');
const deviceSvc = require('../services/modbusDeviceConfigService');
const buffer = require('./modbusSampleBufferRuntime');
const dlq = require('./modbusDlqBridge');
const tracing = require('../observability/modbusTracing');

const _pollers = new Map();
const _stats = {
  polls_total: 0,
  samples_received: 0,
  samples_persisted: 0,
  samples_buffered: 0,
  samples_dlq: 0,
  reconnects: 0,
  errors: 0,
};

function getPollerStats(companyId) {
  const p = _pollers.get(String(companyId));
  if (!p) {
    return { connected: false, real_runtime: true, company_id: companyId };
  }
  return {
    connected: p.connected === true,
    real_runtime: true,
    company_id: companyId,
    host: p.config?.host,
    port: p.config?.port,
    mode: p.effectiveMode,
    last_poll_at: p.last_poll_at,
    register_count: (p.config?.register_map || []).length,
  };
}

function getGlobalStats() {
  return {
    active_pollers: _pollers.size,
    ..._stats,
    clients: [..._pollers.keys()],
  };
}

async function _readRegisterBlock(client, spec) {
  const address = parseInt(spec.address ?? spec.register ?? 0, 10);
  const quantity = Math.min(parseInt(spec.quantity || 1, 10) || 1, 125);
  const fn = String(spec.function || 'holding').toLowerCase();

  if (fn === 'input' || fn === 'input_register') {
    const r = await client.readInputRegisters(address, quantity);
    return r.data;
  }
  if (fn === 'coil' || fn === 'coils') {
    const r = await client.readCoils(address, quantity);
    return r.data.map((v) => (v ? 1 : 0));
  }
  if (fn === 'discrete' || fn === 'discrete_input') {
    const r = await client.readDiscreteInputs(address, quantity);
    return r.data.map((v) => (v ? 1 : 0));
  }
  const r = await client.readHoldingRegisters(address, quantity);
  return r.data;
}

async function _processSample(companyId, address, rawValue, regMeta, effectiveMode, meta = {}) {
  const t0 = Date.now();
  _stats.samples_received += 1;

  const modbusConn = require('../../domains/environment/telemetry/connectors/environmentModbusConnector');
  const sampleBody = modbusConn.convertRegisterToSample(address, rawValue, { ...regMeta, ...meta });
  const registerKey = `${address}`;

  if (!gov.shouldPersistIngest(effectiveMode)) {
    await tracing.trace(companyId, 'sample_audit', 'ok', {
      register_key: registerKey,
      latency_ms: Date.now() - t0,
      replay: meta.replay || false,
      host: meta.host,
    });
    return true;
  }

  try {
    const ingest = require('../../domains/environment/telemetry/environmentTelemetryIngestService');
    const r = await ingest.ingestSingle(companyId, null, sampleBody);
    if (r.ok || r.skipped) {
      _stats.samples_persisted += 1;
      await tracing.trace(companyId, 'sample_persisted', 'ok', {
        register_key: registerKey,
        latency_ms: Date.now() - t0,
        replay: meta.replay || false,
      });
      return true;
    }
    throw new Error(r.code || 'ingest_failed');
  } catch (err) {
    _stats.errors += 1;
    await buffer.bufferSample(companyId, registerKey, { value: rawValue, meta: regMeta });
    _stats.samples_buffered += 1;
    await dlq.moveFailedSample(companyId, registerKey, { value: rawValue }, err?.message);
    _stats.samples_dlq += 1;
    await tracing.trace(companyId, 'sample_failed', 'error', { register_key: registerKey, error: err?.message });
    return false;
  }
}

function _normalizeRegisterList(config, registersOverride) {
  if (Array.isArray(registersOverride) && registersOverride.length) {
    return registersOverride.map((r) => ({
      address: r.address ?? r.register ?? 0,
      quantity: r.quantity || 1,
      function: r.function || 'holding',
      scale: r.scale,
      offset: r.offset,
      unit: r.unit,
      metric_key: r.metric_key,
      environmental_area: r.environmental_area,
      telemetry_type: r.telemetry_type,
      labels: r.labels,
    }));
  }
  return config.register_map || deviceSvc.DEFAULT_REGISTER_MAP;
}

async function _connectClient(config) {
  const client = new ModbusRTU();
  client.setTimeout(config.connect_timeout_ms || 10000);
  const transport = String(config.transport || 'tcp').toLowerCase();
  if (transport === 'rtu') {
    throw new Error('RTU transport requires serial path in metadata — use TCP in pilot');
  }
  await client.connectTCP(config.host, { port: config.port || 502 });
  client.setID(config.unit_id || 1);
  return client;
}

async function executePoll(companyId, registersOverride = null, meta = {}) {
  const key = String(companyId);
  let entry = _pollers.get(key);
  const config = entry?.config || await deviceSvc.getDeviceConfig(companyId);
  if (!config || !config.enabled) {
    return { ok: false, code: 'DEVICE_DISABLED' };
  }

  const effectiveMode = gov.getEffectiveMode(config.mode);
  if (!gov.shouldPollReal(effectiveMode)) {
    return { ok: false, code: 'MODE_SIMULATION', mode: effectiveMode };
  }

  if (!gov.isActiveForTenant(companyId)) {
    return { ok: false, code: 'TENANT_NOT_PILOT' };
  }

  const registerList = _normalizeRegisterList(config, registersOverride);
  const t0 = Date.now();
  let client = entry?.client;
  let connected = entry?.connected;

  try {
    if (!client || !connected) {
      if (client) {
        try {
          client.close(() => {});
        } catch { /* ignore */ }
      }
      client = await _connectClient(config);
      connected = true;
      _stats.reconnects += 1;
      if (!entry) {
        entry = { client, config, effectiveMode, connected: true, timer: null, last_poll_at: null };
        _pollers.set(key, entry);
      } else {
        entry.client = client;
        entry.connected = true;
        entry.config = config;
        entry.effectiveMode = effectiveMode;
      }
      await tracing.trace(companyId, 'device_connected', 'ok', {
        host: config.host,
        port: config.port,
        mode: effectiveMode,
      });
    }

    const samples = [];
    for (const reg of registerList.slice(0, 64)) {
      const values = await _readRegisterBlock(client, reg);
      const baseAddr = parseInt(reg.address ?? 0, 10);
      for (let i = 0; i < values.length; i++) {
        const addr = baseAddr + i;
        await _processSample(companyId, addr, values[i], reg, effectiveMode, {
          ...meta,
          host: `${config.host}:${config.port}`,
        });
        samples.push({ address: addr, value: values[i] });
      }
    }

    if (entry) {
      entry.last_poll_at = new Date().toISOString();
    }
    _stats.polls_total += 1;
    const latency = Date.now() - t0;
    await tracing.trace(companyId, 'poll_completed', 'ok', {
      host: config.host,
      latency_ms: latency,
      register_count: registerList.length,
      samples: samples.length,
    });
    return { ok: true, samples, latency_ms: latency, real: true };
  } catch (err) {
    _stats.errors += 1;
    if (entry) entry.connected = false;
    await tracing.trace(companyId, 'poll_failed', 'error', {
      host: config.host,
      error: err?.message,
    });
    return { ok: false, code: 'POLL_FAILED', error: err?.message, real: true };
  }
}

async function pollRegisters(companyId, registers, meta = {}, maxRetries = 3) {
  let attempt = 0;
  let last = null;
  while (attempt < maxRetries) {
    attempt += 1;
    last = await executePoll(companyId, registers, meta);
    if (last.ok) return last;
  }
  return last || { ok: false, code: 'MODBUS_RETRY_EXHAUSTED', retries: attempt };
}

async function startPoller(companyId, configOverride = null) {
  const companyKey = String(companyId);
  if (_pollers.has(companyKey) && _pollers.get(companyKey).timer) {
    return { ok: true, cached: true, ...getPollerStats(companyId) };
  }

  const config = configOverride || await deviceSvc.getDeviceConfig(companyId);
  if (!config || !config.enabled) {
    return { ok: false, code: 'DEVICE_DISABLED' };
  }

  const effectiveMode = gov.getEffectiveMode(config.mode);
  if (!gov.shouldPollReal(effectiveMode)) {
    return { ok: false, code: 'MODE_SIMULATION', mode: effectiveMode };
  }

  if (!gov.isActiveForTenant(companyId)) {
    return { ok: false, code: 'TENANT_NOT_PILOT' };
  }

  const entry = {
    client: null,
    config,
    effectiveMode,
    connected: false,
    timer: null,
    last_poll_at: null,
  };
  _pollers.set(companyKey, entry);

  const interval = config.poll_interval_ms || 5000;
  const tick = async () => {
    await executePoll(companyId).catch(() => {});
  };

  await tick();
  entry.timer = setInterval(tick, interval);

  return { ok: true, started: true, mode: effectiveMode, host: config.host, port: config.port };
}

async function stopPoller(companyId) {
  const key = String(companyId);
  const entry = _pollers.get(key);
  if (!entry) return { ok: true, stopped: false };
  if (entry.timer) {
    clearInterval(entry.timer);
    entry.timer = null;
  }
  if (entry.client) {
    try {
      entry.client.close(() => {});
    } catch { /* ignore */ }
  }
  _pollers.delete(key);
  await tracing.trace(companyId, 'poller_stopped', 'ok', {});
  return { ok: true, stopped: true };
}

async function reconnect(companyId) {
  await stopPoller(companyId);
  return startPoller(companyId);
}

async function bootPilotPollers() {
  const pilots = gov.getDiagnostics().pilot_tenants || [];
  const results = [];
  for (const tid of pilots) {
    try {
      await deviceSvc.upsertDeviceConfig(tid, { enabled: true, mode: gov.getDiagnostics().mode });
      const r = await startPoller(tid);
      results.push({ tenant_id: tid, ...r });
    } catch (err) {
      results.push({ tenant_id: tid, ok: false, error: err?.message });
    }
  }
  return results;
}

async function warmBoot() {
  await deviceSvc.ensureSchema();
  await buffer.purgeExpired();

  const mode = gov.getDiagnostics().mode;
  let clients = { skipped: true };

  if (gov.shouldPollReal(mode)) {
    clients = await bootPilotPollers();
  }

  return { ok: true, mode, clients };
}

module.exports = {
  startPoller,
  stopPoller,
  reconnect,
  executePoll,
  pollRegisters,
  bootPilotPollers,
  warmBoot,
  getPollerStats,
  getGlobalStats,
  _processSample,
};
