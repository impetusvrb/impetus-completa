'use strict';

/**
 * Vector Health & Observability — Rota interna (admin/internal).
 *
 * Endpoints:
 *   GET /api/internal/vector-health          — health check completo
 *   GET /api/internal/vector-health/events   — últimos eventos vetoriais
 *   GET /api/internal/vector-health/metrics  — métricas brutas
 *   POST /api/internal/vector-health/rebuild — iniciar safe rebuild (requer auth admin)
 */

const express = require('express');
const router = express.Router();

let vectorRuntime = null;
try {
  vectorRuntime = require('../../services/vectorRuntimeService');
} catch (e) {
  console.warn('[VECTOR_HEALTH_ROUTE] vectorRuntimeService não carregado:', e.message);
}

router.get('/', async (_req, res) => {
  if (!vectorRuntime) {
    return res.json({ status: 'unavailable', message: 'vectorRuntimeService não carregado.' });
  }
  try {
    const health = await vectorRuntime.getVectorHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

router.get('/events', (_req, res) => {
  if (!vectorRuntime) {
    return res.json({ events: [] });
  }
  const limit = Math.min(parseInt(_req.query.limit, 10) || 100, 500);
  res.json({ events: vectorRuntime.getVectorEvents(limit) });
});

router.get('/metrics', (_req, res) => {
  if (!vectorRuntime) {
    return res.json({ metrics: null });
  }
  res.json({ metrics: vectorRuntime.getMetrics() });
});

router.get('/capabilities', async (_req, res) => {
  if (!vectorRuntime) {
    return res.json({ capabilities: null });
  }
  try {
    const cap = await vectorRuntime.checkCapabilities();
    res.json({ capabilities: cap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rebuild', async (req, res) => {
  if (!vectorRuntime) {
    return res.status(503).json({ error: 'vectorRuntimeService não disponível.' });
  }
  const onlyNulls = req.body?.only_nulls !== false;
  const batchSize = Math.min(parseInt(req.body?.batch_size, 10) || 50, 200);

  let ai;
  try {
    ai = require('../../services/ai');
  } catch (e) {
    return res.status(503).json({ error: 'Serviço de IA não disponível.' });
  }

  res.json({
    message: 'Rebuild iniciado em background.',
    params: { only_nulls: onlyNulls, batch_size: batchSize }
  });

  vectorRuntime.safeRebuild({
    embedFn: (text) => ai.embedText(text),
    batchSize,
    delayMs: 300,
    onlyNulls,
    onProgress: (p) => {
      if (p.batches_completed % 10 === 0) {
        console.log(`[VECTOR_REBUILD_PROGRESS] ${p.processed}/${p.total_rows} (${p.succeeded} ok, ${p.failed} fail)`);
      }
    }
  }).catch(err => {
    console.error('[VECTOR_REBUILD_ERROR]', err.message);
  });
});

module.exports = router;
