'use strict';

const mqtt = require('mqtt');
const gov = require('../governance/mqttGovernanceService');
const brokerSvc = require('../services/mqttBrokerConfigService');
const buffer = require('./mqttBufferReplayRuntime');
const dlq = require('./mqttDlqBridge');
const tracing = require('../observability/mqttTracing');

const _clients = new Map();
const _stats = {
  messages_received: 0,
  messages_persisted: 0,
  messages_buffered: 0,
  messages_dlq: 0,
  reconnects: 0,
  errors: 0,
};

function getClientStats(companyId) {
  const c = _clients.get(String(companyId));
  if (!c) {
    return { connected: false, real_runtime: true, company_id: companyId };
  }
  return {
    connected: c.client?.connected === true,
    real_runtime: true,
    company_id: companyId,
    broker_url: c.config?.broker_url,
    mode: c.effectiveMode,
    topics: c.config?.topic_subscriptions || [],
    last_message_at: c.last_message_at,
    buffered: c.buffered || 0,
  };
}

function getGlobalStats() {
  return {
    active_clients: _clients.size,
    ..._stats,
    clients: [..._clients.keys()],
  };
}

function _parsePayload(buf) {
  try {
    return JSON.parse(buf.toString());
  } catch {
    return { raw: buf.toString('utf8').slice(0, 2000), value: 0, telemetry_type: 'raw' };
  }
}

async function _processMessage(companyId, topic, payload, effectiveMode, meta = {}) {
  const t0 = Date.now();
  _stats.messages_received += 1;

  const mqttConnector = require('../../domains/environment/telemetry/connectors/environmentMqttConnector');
  const norm = mqttConnector.ingestMqttMessage(companyId, topic, payload);
  if (!norm.ok) {
    await tracing.trace(companyId, 'message_rejected', 'skipped', { topic, code: norm.code });
    return false;
  }

  if (!gov.shouldPersistIngest(effectiveMode)) {
    await tracing.trace(companyId, 'message_audit', 'ok', {
      topic,
      latency_ms: Date.now() - t0,
      replay: meta.replay || false,
    });
    return true;
  }

  try {
    const runtime = require('../../domains/environment/telemetry/environmentTelemetryRuntime');
    const ingest = require('../../domains/environment/telemetry/environmentTelemetryIngestService');
    const r = await runtime.processConnectorIngest(companyId, null, 'mqtt', {
      topic,
      message: payload,
      ...norm.sampleBody,
    });
    if (r.ok || r.skipped) {
      _stats.messages_persisted += 1;
      await tracing.trace(companyId, 'message_persisted', 'ok', {
        topic,
        latency_ms: Date.now() - t0,
        replay: meta.replay || false,
      });
      return true;
    }
    throw new Error(r.code || 'ingest_failed');
  } catch (err) {
    _stats.errors += 1;
    await buffer.bufferMessage(companyId, topic, payload, meta.qos || 1);
    _stats.messages_buffered += 1;
    await dlq.moveFailedMessage(companyId, topic, payload, err?.message);
    _stats.messages_dlq += 1;
    await tracing.trace(companyId, 'message_failed', 'error', { topic, error: err?.message });
    return false;
  }
}

async function startClient(companyId, configOverride = null) {
  const companyKey = String(companyId);
  if (_clients.has(companyKey)) {
    return { ok: true, cached: true, ...getClientStats(companyId) };
  }

  const config = configOverride || await brokerSvc.getBrokerConfig(companyId);
  if (!config || !config.enabled) {
    return { ok: false, code: 'BROKER_DISABLED' };
  }

  const effectiveMode = gov.getEffectiveMode(config.mode);
  if (!gov.shouldConnectReal(effectiveMode)) {
    return { ok: false, code: 'MODE_SIMULATION', mode: effectiveMode };
  }

  if (!gov.isActiveForTenant(companyId)) {
    return { ok: false, code: 'TENANT_NOT_PILOT' };
  }

  const password = brokerSvc.resolvePassword(config);
  const options = {
    clientId: config.client_id || `impetus-${companyKey.slice(0, 8)}`,
    username: config.username || undefined,
    password: password || undefined,
    clean: config.clean_session !== false,
    reconnectPeriod: config.reconnect_period_ms || 5000,
    connectTimeout: config.connect_timeout_ms || 30000,
    qos: config.qos ?? 1,
  };

  const client = mqtt.connect(config.broker_url, options);

  const entry = {
    client,
    config,
    effectiveMode,
    last_message_at: null,
    buffered: 0,
  };
  _clients.set(companyKey, entry);

  client.on('connect', async () => {
    _stats.reconnects += 1;
    await tracing.trace(companyId, 'broker_connected', 'ok', {
      broker_url: config.broker_url,
      mode: effectiveMode,
    });

    const replay = await buffer.replayPending(companyId, (topic, payload, meta) =>
      _processMessage(companyId, topic, payload, effectiveMode, meta)
    );
    entry.buffered = replay.replayed;

    const topics = config.topic_subscriptions || ['plant/#'];
    for (const topic of topics) {
      client.subscribe(topic, { qos: config.qos ?? 1 }, (err) => {
        if (err) tracing.trace(companyId, 'subscribe_error', 'error', { topic, error: err.message });
      });
    }
  });

  client.on('reconnect', () => {
    tracing.trace(companyId, 'broker_reconnecting', 'ok', { broker_url: config.broker_url });
  });

  client.on('error', (err) => {
    _stats.errors += 1;
    tracing.trace(companyId, 'broker_error', 'error', { error: err?.message });
  });

  client.on('message', async (topic, message) => {
    entry.last_message_at = new Date().toISOString();
    const payload = _parsePayload(message);
    await _processMessage(companyId, topic, payload, effectiveMode, { qos: config.qos });
  });

  client.on('offline', () => {
    tracing.trace(companyId, 'broker_offline', 'warn', {});
  });

  return { ok: true, started: true, mode: effectiveMode, broker_url: config.broker_url };
}

async function stopClient(companyId) {
  const key = String(companyId);
  const entry = _clients.get(key);
  if (!entry) return { ok: true, stopped: false };
  try {
    entry.client.end(true);
  } catch { /* ignore */ }
  _clients.delete(key);
  await tracing.trace(companyId, 'broker_stopped', 'ok', {});
  return { ok: true, stopped: true };
}

async function reconnect(companyId) {
  await stopClient(companyId);
  return startClient(companyId);
}

async function bootPilotClients() {
  const pilots = gov.getDiagnostics().pilot_tenants || [];
  const results = [];
  for (const tid of pilots) {
    try {
      await brokerSvc.upsertBrokerConfig(tid, { enabled: true, mode: gov.getDiagnostics().mode });
      const r = await startClient(tid);
      results.push({ tenant_id: tid, ...r });
    } catch (err) {
      results.push({ tenant_id: tid, ok: false, error: err?.message });
    }
  }
  return results;
}

async function warmBoot() {
  await brokerSvc.ensureSchema();
  await buffer.purgeExpired();

  const mode = gov.getDiagnostics().mode;
  let clients = { skipped: true };

  if (gov.shouldConnectReal(mode)) {
    clients = await bootPilotClients();
  }

  return { ok: true, mode, clients };
}

module.exports = {
  startClient,
  stopClient,
  reconnect,
  bootPilotClients,
  warmBoot,
  getClientStats,
  getGlobalStats,
  _processMessage,
};
