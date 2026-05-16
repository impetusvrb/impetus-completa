'use strict';

/**
 * Rotas internas — WAVE 1 Industrial Event Backbone (health, replay shadow).
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
  '/outbox/drain',
  _safe(async (_req, res) => {
    const outbox = require('../../eventPipeline/outbox/industrialOutboxService');
    const replay = require('../../eventPipeline/replay/shadowReplayWorker');
    const result = await outbox.drainOutboxBatch(replay.shadowReplayHandler);
    res.json({ ok: true, ...result });
  })
);

module.exports = router;
