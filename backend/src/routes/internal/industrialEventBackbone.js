'use strict';

/**
 * Rotas internas — Industrial Event Backbone WAVE 1 + WAVE 2 (health, replay, recovery, archive, DLQ).
 */

const express = require('express');
const router = express.Router();

function _safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[INDUSTRIAL_EVENT_BACKBONE_ROUTE]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };
}

router.get(
  '/health',
  _safe(async (_req, res) => {
    const backbone = require('../../eventPipeline/industrialEventBackbone');
    res.json({ ok: true, ...backbone.getIndustrialBackboneHealth(), timestamp: new Date().toISOString() });
  })
);

router.get(
  '/catalog',
  _safe(async (_req, res) => {
    const catalog = require('../../eventPipeline/catalog/industrialEventCatalog');
    res.json({ ok: true, ...catalog.getCatalogSnapshot() });
  })
);

router.get(
  '/governance',
  _safe(async (_req, res) => {
    const gov = require('../../eventPipeline/governance/industrialRetentionGovernance');
    const snapshot = await gov.getGovernanceSnapshot();
    res.json({ ok: true, ...snapshot });
  })
);

router.post(
  '/replay/shadow',
  _safe(async (req, res) => {
    const replay = require('../../eventPipeline/replay/shadowReplayWorker');
    const limit = req.body && req.body.limit != null ? Number(req.body.limit) : 100;
    const source = req.body && req.body.source ? String(req.body.source) : undefined;
    const result = await replay.runShadowReplay({ limit, source });
    res.json({ ok: true, ...result });
  })
);

router.post(
  '/replay',
  _safe(async (req, res) => {
    const orch = require('../../eventPipeline/replay/industrialReplayOrchestrator');
    const limit = req.body && req.body.limit != null ? Number(req.body.limit) : 100;
    const source = req.body && req.body.source ? String(req.body.source) : 'outbox';
    const mode = req.body && req.body.mode ? String(req.body.mode) : undefined;
    const company_id = req.user?.company_id || undefined;
    const result = await orch.runGovernedReplay({ limit, source, mode, company_id });
    res.json(result);
  })
);

router.post(
  '/recovery/run',
  _safe(async (req, res) => {
    const recovery = require('../../eventPipeline/recovery/streamRecoveryWorker');
    const limit = req.body && req.body.limit != null ? Number(req.body.limit) : 500;
    const stale_ms = req.body && req.body.stale_ms != null ? Number(req.body.stale_ms) : undefined;
    const result = await recovery.runStreamRecovery({ limit, stale_ms });
    res.json(result);
  })
);

router.post(
  '/archive/run',
  _safe(async (req, res) => {
    const archive = require('../../eventPipeline/archive/industrialArchiveService');
    const batch_size = req.body && req.body.batch_size != null ? Number(req.body.batch_size) : undefined;
    const company_id = req.user?.company_id || undefined;
    const delivered_days = req.body && req.body.delivered_days != null ? Number(req.body.delivered_days) : undefined;
    const result = await archive.archiveDeliveredBatch({ batch_size, company_id, delivered_days });
    res.json(result);
  })
);

router.post(
  '/dlq/redrive',
  _safe(async (req, res) => {
    const dlq = require('../../eventPipeline/dlq/industrialDlqService');
    const limit = req.body && req.body.limit != null ? Number(req.body.limit) : 50;
    const company_id = req.user?.company_id || undefined;
    const dry_run = req.body && req.body.dry_run != null ? !!req.body.dry_run : undefined;
    const result = await dlq.redriveFromDlq({ limit, company_id, dry_run });
    res.json(result);
  })
);

router.post(
  '/outbox/drain',
  _safe(async (_req, res) => {
    const outbox = require('../../eventPipeline/outbox/industrialOutboxService');
    const replay = require('../../eventPipeline/replay/shadowReplayWorker');
    const result = await outbox.drainOutboxBatch(replay.shadowReplayHandler);
    res.json({ ok: true, ...result });
  })
);

// ─── CERT-EVENT-RETENTION-01 — rotas aditivas de lifecycle / retenção ────────
router.get(
  '/retention/policies',
  _safe(async (_req, res) => {
    const engine = require('../../eventPipeline/retention/eventRetentionEngine');
    const policies = await engine.loadPolicies();
    const catalog = require('../../eventPipeline/retention/eventBackboneCategoryRegistry');
    res.json({ ok: true, policies, categories: catalog.getCategoryCatalog() });
  })
);

router.get(
  '/retention/diagnostics',
  _safe(async (_req, res) => {
    const engine = require('../../eventPipeline/retention/eventRetentionEngine');
    const scheduler = require('../../eventPipeline/retention/eventRetentionScheduler');
    const diagnostics = await engine.getRetentionDiagnostics();
    res.json({ ok: true, ...diagnostics, scheduler: scheduler.getSchedulerStatus() });
  })
);

router.get(
  '/retention/archive/query',
  _safe(async (req, res) => {
    const archive = require('../../eventPipeline/retention/eventArchiveService');
    const result = await archive.queryArchivedEvents({
      limit: req.query.limit,
      company_id: req.user?.company_id || req.query.company_id,
      lifecycle_state: req.query.lifecycle_state,
      category: req.query.category,
      event_name: req.query.event_name,
      since: req.query.since
    });
    res.json(result);
  })
);

router.get(
  '/retention/archive/:id/explain',
  _safe(async (req, res) => {
    const explain = require('../../eventPipeline/retention/eventRetentionExplainability');
    const result = await explain.explainArchivedEvent(req.params.id);
    res.status(result.ok ? 200 : 404).json(result);
  })
);

router.get(
  '/retention/archive/:id/integrity',
  _safe(async (req, res) => {
    const archive = require('../../eventPipeline/retention/eventArchiveService');
    const result = await archive.validateIntegrity(req.params.id);
    res.status(result.ok ? 200 : 404).json(result);
  })
);

router.post(
  '/retention/run',
  _safe(async (req, res) => {
    const engine = require('../../eventPipeline/retention/eventRetentionEngine');
    const result = await engine.runRetentionCycle({
      archive_batch_size: req.body?.archive_batch_size,
      company_id: req.user?.company_id || req.body?.company_id,
      delivered_days: req.body?.delivered_days,
      compress: req.body?.compress
    });
    res.json(result);
  })
);

router.post(
  '/retention/archive/run',
  _safe(async (req, res) => {
    const archive = require('../../eventPipeline/retention/eventArchiveService');
    const result = await archive.archiveWithLifecycle({
      batch_size: req.body?.batch_size,
      company_id: req.user?.company_id || req.body?.company_id,
      delivered_days: req.body?.delivered_days
    });
    res.json(result);
  })
);

router.post(
  '/retention/archive/:id/restore',
  _safe(async (req, res) => {
    const archive = require('../../eventPipeline/retention/eventArchiveService');
    const observability = require('../../services/observabilityService');
    observability.incrementMetric('event_restore_requests');
    const result = await archive.restoreArchiveMetadata(req.params.id, {
      dry_run: req.body?.dry_run !== false
    });
    res.status(result.ok ? 200 : 404).json(result);
  })
);

router.post(
  '/retention/compress',
  _safe(async (req, res) => {
    const archive = require('../../eventPipeline/retention/eventArchiveService');
    const result = await archive.compressArchivedBatch({
      batch_size: req.body?.batch_size
    });
    res.json(result);
  })
);

module.exports = router;
