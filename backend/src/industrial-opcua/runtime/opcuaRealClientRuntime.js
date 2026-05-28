'use strict';

const path = require('path');
const { execSync } = require('child_process');
try {
  execSync(`node "${path.join(__dirname, '../../../scripts/fix-opcua-hexy-cjs.js')}"`, {
    stdio: 'pipe',
    cwd: path.join(__dirname, '../../..'),
  });
} catch { /* hexy CJS — mesmo host */ }

const {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSubscription,
  ClientMonitoredItem,
  TimestampsToReturn,
} = require('node-opcua');

const gov = require('../governance/opcuaGovernanceService');
const serverSvc = require('../services/opcuaServerConfigService');
const buffer = require('./opcuaSampleBufferRuntime');
const dlq = require('./opcuaDlqBridge');
const tracing = require('../observability/opcuaTracing');

const _clients = new Map();
const _startInflight = new Map();
const _stats = {
  samples_received: 0,
  samples_persisted: 0,
  samples_buffered: 0,
  samples_dlq: 0,
  reconnects: 0,
  errors: 0,
};

function _resolveSecurityMode(modeStr) {
  const m = String(modeStr || 'None');
  if (m === 'Sign') return MessageSecurityMode.Sign;
  if (m === 'SignAndEncrypt') return MessageSecurityMode.SignAndEncrypt;
  return MessageSecurityMode.None;
}

function _resolveSecurityPolicy(policyStr) {
  const p = String(policyStr || 'None');
  const map = {
    None: SecurityPolicy.None,
    Basic128Rsa15: SecurityPolicy.Basic128Rsa15,
    Basic256: SecurityPolicy.Basic256,
    Basic256Sha256: SecurityPolicy.Basic256Sha256,
  };
  return map[p] || SecurityPolicy.None;
}

function getClientStats(companyId) {
  const c = _clients.get(String(companyId));
  if (!c) {
    return { connected: false, real_runtime: true, company_id: companyId };
  }
  return {
    connected: c.connected === true,
    real_runtime: true,
    company_id: companyId,
    endpoint_url: c.config?.endpoint_url,
    mode: c.effectiveMode,
    subscriptions: c.config?.node_subscriptions || [],
    last_sample_at: c.last_sample_at,
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

async function _processSample(companyId, nodeId, value, effectiveMode, meta = {}) {
  const t0 = Date.now();
  _stats.samples_received += 1;

  const opcuaConn = require('../../domains/environment/telemetry/connectors/environmentOpcUaConnector');
  const norm = opcuaConn.ingestSubscriptionSample(companyId, nodeId, value, meta);
  if (!norm.ok) {
    await tracing.trace(companyId, 'sample_rejected', 'skipped', { node_id: nodeId, code: norm.code });
    return false;
  }

  if (!gov.shouldPersistIngest(effectiveMode)) {
    await tracing.trace(companyId, 'sample_audit', 'ok', {
      node_id: nodeId,
      latency_ms: Date.now() - t0,
      replay: meta.replay || false,
    });
    return true;
  }

  try {
    const runtime = require('../../domains/environment/telemetry/environmentTelemetryRuntime');
    const r = await runtime.processConnectorIngest(companyId, null, 'opcua', {
      node_id: nodeId,
      value,
      meta,
    });
    if (r.ok || r.skipped) {
      _stats.samples_persisted += 1;
      await tracing.trace(companyId, 'sample_persisted', 'ok', {
        node_id: nodeId,
        latency_ms: Date.now() - t0,
        replay: meta.replay || false,
      });
      return true;
    }
    throw new Error(r.code || 'ingest_failed');
  } catch (err) {
    _stats.errors += 1;
    await buffer.bufferSample(companyId, nodeId, { value, meta }, meta.status || 'Good');
    _stats.samples_buffered += 1;
    await dlq.moveFailedSample(companyId, nodeId, { value, meta }, err?.message);
    _stats.samples_dlq += 1;
    await tracing.trace(companyId, 'sample_failed', 'error', { node_id: nodeId, error: err?.message });
    return false;
  }
}

async function startClient(companyId, configOverride = null, attempt = 0) {
  const companyKey = String(companyId);
  const existing = _clients.get(companyKey);
  if (existing?.connected && existing?.session) {
    return { ok: true, cached: true, ...getClientStats(companyId) };
  }
  if (attempt === 0 && _startInflight.has(companyKey)) {
    return _startInflight.get(companyKey);
  }

  const run = _startClientOnce(companyId, configOverride, attempt);
  if (attempt === 0) _startInflight.set(companyKey, run);
  try {
    return await run;
  } finally {
    if (attempt === 0) _startInflight.delete(companyKey);
  }
}

async function _startClientOnce(companyId, configOverride = null, attempt = 0) {
  const companyKey = String(companyId);

  if (attempt === 0) {
    await new Promise((r) => setTimeout(r, 2500));
  }

  const config = configOverride || await serverSvc.getServerConfig(companyId);
  if (!config || !config.enabled) {
    return { ok: false, code: 'SERVER_DISABLED' };
  }

  const effectiveMode = gov.getEffectiveMode(config.mode);
  if (!gov.shouldConnectReal(effectiveMode)) {
    return { ok: false, code: 'MODE_SIMULATION', mode: effectiveMode };
  }

  if (!gov.isActiveForTenant(companyId)) {
    return { ok: false, code: 'TENANT_NOT_PILOT' };
  }

  const password = serverSvc.resolvePassword(config);
  const client = OPCUAClient.create({
    applicationName: 'NodeOPCUA-Client',
    connectionStrategy: {
      initialDelay: 1000,
      maxRetry: 5,
    },
    endpointMustExist: false,
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
  });

  let connectUrl = config.endpoint_url;
  try {
    const fs = require('fs');
    const epFile = require('path').join(__dirname, '../../../.opcua-lab-endpoint.txt');
    if (fs.existsSync(epFile)) connectUrl = fs.readFileSync(epFile, 'utf8').trim();
  } catch { /* optional */ }

  const entry = {
    client,
    config,
    effectiveMode,
    connected: false,
    last_sample_at: null,
    buffered: 0,
    session: null,
    subscription: null,
  };

  try {
    await client.connect(connectUrl);
    entry.connected = true;
    _stats.reconnects += 1;
    await tracing.trace(companyId, 'server_connected', 'ok', {
      endpoint_url: config.endpoint_url,
      mode: effectiveMode,
    });

    const session =
      config.username && String(config.username).trim()
        ? await client.createSession(String(config.username), password || '')
        : await client.createSession();
    entry.session = session;
    _clients.set(companyKey, entry);

    try {
      const replay = await buffer.replayPending(companyId, (nodeId, payload) =>
        _processSample(companyId, nodeId, payload?.value, effectiveMode, {
          ...(payload?.meta || {}),
          replay: true,
        })
      );
      entry.buffered = replay.replayed;
    } catch (replayErr) {
      console.warn('[OPCUA_REAL] buffer replay skipped:', replayErr?.message);
    }

    let nodes = config.node_subscriptions || ['ns=2;s=Simulator1'];
    try {
      const fs = require('fs');
      const p = require('path').join(__dirname, '../../../.opcua-lab-nodes.json');
      if (fs.existsSync(p)) {
        const lab = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (lab.nodes?.length) nodes = lab.nodes;
      }
    } catch { /* optional lab map */ }

    const pollMs = config.sampling_interval_ms || 1000;
    entry.pollTimer = setInterval(async () => {
      if (!entry.session) return;
      for (const nodeId of nodes) {
        try {
          const dv = await entry.session.read({ nodeId, attributeId: AttributeIds.Value });
          entry.last_sample_at = new Date().toISOString();
          const value = dv.value?.value;
          await _processSample(companyId, nodeId, value, effectiveMode, {
            unit: config.default_unit,
            recorded_at: new Date().toISOString(),
          });
        } catch { /* single node read */ }
      }
    }, pollMs);

    return { ok: true, started: true, mode: effectiveMode, endpoint_url: connectUrl, poll_mode: true };
  } catch (err) {
    _stats.errors += 1;
    if (_clients.get(companyKey) === entry) _clients.delete(companyKey);
    try {
      await client.disconnect();
    } catch { /* ignore */ }
    const errMsg = err?.message || err?.name || (err && String(err)) || 'unknown';
    console.warn('[OPCUA_REAL] startClient failed:', errMsg, err?.stack?.split('\n')[0]);
    await tracing.trace(companyId, 'server_connect_failed', 'error', {
      endpoint_url: config.endpoint_url,
      error: errMsg,
    });
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 8000));
      return startClient(companyId, configOverride, attempt + 1);
    }
    return {
      ok: false,
      code: 'CONNECT_FAILED',
      error: err?.message || err?.name || String(err),
      connect_url: connectUrl,
    };
  }
}

async function stopClient(companyId) {
  const key = String(companyId);
  const entry = _clients.get(key);
  if (!entry) return { ok: true, stopped: false };
  try {
    if (entry.pollTimer) {
      clearInterval(entry.pollTimer);
      entry.pollTimer = null;
    }
    if (entry.subscription) {
      await entry.subscription.terminate();
    }
    if (entry.session) {
      await entry.session.close();
    }
    await entry.client.disconnect();
  } catch { /* ignore */ }
  _clients.delete(key);
  await tracing.trace(companyId, 'server_stopped', 'ok', {});
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
      await serverSvc.upsertServerConfig(tid, { enabled: true, mode: gov.getDiagnostics().mode });
      const r = await startClient(tid);
      results.push({ tenant_id: tid, ...r });
    } catch (err) {
      results.push({ tenant_id: tid, ok: false, error: err?.message });
    }
  }
  return results;
}

async function warmBoot() {
  await serverSvc.ensureSchema();
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
  _processSample,
};
