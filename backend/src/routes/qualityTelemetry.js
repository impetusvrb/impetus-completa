'use strict';

/**
 * Quality — Industrial Telemetry Runtime API (tenant-auth).
 * Flag mestre: IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED
 */

const express = require('express');
const router = express.Router();

const flags = require('../domains/quality/telemetry/qualityTelemetryRuntimeFlags');
const ingest = require('../domains/quality/telemetry/qualityTelemetryIngestService');
const storageFlags = require('../storage/storageFlags');
const obs = require('../services/operational/enterpriseObservabilityRuntime');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    telemetry_runtime_enabled: flags.isQualityTelemetryRuntimeEnabled(),
    flags: flags.getTelemetryRuntimeFlagSnapshot(),
    dependencies: ingest.getIngestDependencySnapshot()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isQualityTelemetryRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'QUALITY_TELEMETRY_OFF' });
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
    obs.recordMetric('quality_telemetry_api_ingest_v1_total', 1, {});
    const r = await ingest.ingestSingle(companyId, user?.id, req.body);
    if (r.code === 'W3_TELEMETRY_INGEST_OFF') {
      return res.status(503).json(r);
    }
    if (r.code === 'INVALID_PAYLOAD') {
      return res.status(400).json(r);
    }
    if (!r.ok && !r.skipped) {
      return res.status(502).json(r);
    }
    res.json(r);
  } catch (err) {
    console.error('[qualityTelemetry/ingest/v1]', err?.message || err);
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
    obs.recordMetric('quality_telemetry_api_ingest_dimensional_total', 1, {});
    const r = await ingest.ingestSingle(companyId, user?.id, req.body);
    if (r.code === 'W3_TELEMETRY_INGEST_OFF') {
      return res.status(503).json(r);
    }
    if (r.code === 'INVALID_PAYLOAD') {
      return res.status(400).json(r);
    }
    if (!r.ok && !r.skipped) {
      return res.status(502).json(r);
    }
    res.json(r);
  } catch (err) {
    console.error('[qualityTelemetry/ingest/dimensional]', err?.message || err);
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
      return res.status(503).json({ ok: false, code: 'W3_TELEMETRY_INGEST_OFF', reason: 'telemetry_ingest_disabled' });
    }
    obs.recordMetric('quality_telemetry_api_ingest_batch_total', 1, { n: String(Math.min(items.length, 20)) });
    const r = await ingest.ingestBatch(companyId, user?.id, items);
    const { summary } = r;
    if (summary.accepted === 0 && summary.failed > 0) {
      return res.status(502).json(r);
    }
    res.json(r);
  } catch (err) {
    console.error('[qualityTelemetry/ingest/batch]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
