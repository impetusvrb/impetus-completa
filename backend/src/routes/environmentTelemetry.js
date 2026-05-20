'use strict';

/**
 * Environment — Industrial Telemetry Runtime API (tenant-auth).
 * Flag mestre: IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED
 */

const express = require('express');
const router = express.Router();

const flags = require('../domains/environment/telemetry/environmentTelemetryRuntimeFlags');
const ingest = require('../domains/environment/telemetry/environmentTelemetryIngestService');
const orchestrator = require('../domains/environment/telemetry/environmentTelemetryOrchestrator');
const edge = require('../domains/environment/telemetry/environmentEdgeTelemetryRuntime');
const realtime = require('../domains/environment/telemetry/environmentRealtimeIngestionRuntime');
const validation = require('../domains/environment/telemetry/validation/environmentTelemetryRuntimeValidation');
const storageFlags = require('../storage/storageFlags');
const mqtt = require('../domains/environment/telemetry/connectors/environmentMqttConnector');
const opcua = require('../domains/environment/telemetry/connectors/environmentOpcUaConnector');
const modbus = require('../domains/environment/telemetry/connectors/environmentModbusConnector');
const obs = require('../domains/environment/telemetry/environmentTelemetryObservability');
const { requireTechnicalRuntimeAccess, sanitizeTechnicalResponse } = require('../middleware/technicalRuntimeAccess');
const techGuard = require('../domainAuthority/guards/technicalRuntimeAccessGuard');

router.get('/health', async (req, res) => {
  const snap = await orchestrator.orchestrateHealth();
  const payload = {
    ok: true,
    telemetry_runtime_enabled: flags.isEnvironmentTelemetryRuntimeEnabled(),
    flags: flags.getTelemetryRuntimeFlagSnapshot(),
    dependencies: ingest.getIngestDependencySnapshot(),
    foundation: snap
  };
  res.json(techGuard.sanitizeTechnicalPayload(payload, req.user));
});

router.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/validation/run') return next();
  if (!flags.isEnvironmentTelemetryRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'ENVIRONMENT_TELEMETRY_OFF' });
  }
  next();
});

router.post('/ingest/v1', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    obs.record('environment_telemetry_api_ingest_v1_total', 1, {});
    const r = await ingest.ingestSingle(companyId, user?.id, req.body);
    if (r.code === 'W3_TELEMETRY_INGEST_OFF') return res.status(503).json(r);
    if (r.code === 'INVALID_PAYLOAD') return res.status(400).json(r);
    if (!r.ok && !r.skipped) return res.status(502).json(r);
    res.json(r);
  } catch (err) {
    console.error('[environmentTelemetry/ingest/v1]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/ingest/dimensional', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const dim = req.body?.dimensional;
    if (dim == null || typeof dim !== 'object' || Array.isArray(dim) || !Object.keys(dim).length) {
      return res.status(400).json({ ok: false, error: 'dimensional_required' });
    }
    const r = await ingest.ingestSingle(companyId, user?.id, req.body);
    if (r.code === 'W3_TELEMETRY_INGEST_OFF') return res.status(503).json(r);
    if (r.code === 'INVALID_PAYLOAD') return res.status(400).json(r);
    if (!r.ok && !r.skipped) return res.status(502).json(r);
    res.json(r);
  } catch (err) {
    console.error('[environmentTelemetry/ingest/dimensional]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/ingest/batch', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const items = req.body?.samples;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, error: 'samples_required' });
    }
    if (!storageFlags.isTelemetryIsolatedIngestEnabled()) {
      return res.status(503).json({ ok: false, code: 'W3_TELEMETRY_INGEST_OFF' });
    }
    const r = await ingest.ingestBatch(companyId, user?.id, items);
    if (r.summary.accepted === 0 && r.summary.failed > 0) return res.status(502).json(r);
    res.json(r);
  } catch (err) {
    console.error('[environmentTelemetry/ingest/batch]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/ingest/realtime', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
    const r = await realtime.ingestRealtimeStream(companyId, user?.id, req.body?.samples, ingest.ingestSingle);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.get('/edge/queue', (req, res) => {
  const companyId = req.user?.company_id;
  if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
  res.json({ ok: true, ...edge.getEdgeQueueSnapshot(companyId) });
});

router.post('/edge/enqueue', (req, res) => {
  const companyId = req.user?.company_id;
  if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
  const r = edge.enqueueEdgeSample(companyId, req.body || {});
  if (r.code === 'EDGE_OFF') return res.status(503).json(r);
  res.json(r);
});

router.post('/edge/sync', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
    const r = await orchestrator.orchestrateEdgeSync(companyId, user?.id);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/connectors/:connector/ingest', requireTechnicalRuntimeAccess('environment_connectors_ingest'), async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
    const r = await orchestrator.orchestrateConnector(companyId, user?.id, req.params.connector, req.body || {});
    if (!r.ok && r.code) return res.status(503).json(r);
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.get('/connectors/status', requireTechnicalRuntimeAccess('environment_connectors_status'), (req, res) => {
  const payload = {
    ok: true,
    mqtt: mqtt.getMqttState(),
    opcua: opcua.getOpcUaState(),
    modbus: modbus.getModbusState()
  };
  res.json(techGuard.sanitizeTechnicalPayload(payload, req.user));
});

router.post('/connectors/reconnect', requireTechnicalRuntimeAccess('environment_connectors_reconnect'), async (req, res) => {
  const user = req.user;
  const companyId = user?.company_id;
  const source = req.body?.source || 'manual';
  mqtt.simulateReconnect();
  opcua.simulateReconnect();
  await orchestrator.publishReconnectCompleted(companyId, user?.id, source);
  res.json({ ok: true, reconnect_completed: true });
});

router.get('/validation/run', (req, res) => {
  res.json(validation.runFullTelemetryValidation());
});

module.exports = router;
