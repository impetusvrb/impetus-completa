'use strict';

/**
 * AIOI-P1A.6 — Runtime Health & Metrics Routes
 *
 * GET /api/aioi/runtime/health   — health completo do runtime contínuo
 * GET /api/aioi/runtime/metrics  — métricas operacionais detalhadas
 * GET /api/aioi/runtime/status   — estado do worker
 *
 * READ ONLY — sem side-effects.
 * ADDITIVE ONLY — não altera aioiQueueRoutes.
 */

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const continuousWorker = require('../../services/aioi/runtime/aioiContinuousWorkerService');
const metricsService   = require('../../services/aioi/runtime/aioiRuntimeMetricsService');
const pilotFlags       = require('../../services/aioi/aioiPilotFlags');

const readOnlyMw = [requireAuth, requireCompanyActive];

// ─── GET /api/aioi/runtime/health ─────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const flags = pilotFlags.getAioiFlags();
    const status = continuousWorker.getWorkerStatus();
    const metrics = await metricsService.getMetricsSnapshot();

    const invariantsPreserved =
      continuousWorker.RUNTIME_INVARIANTS.runtime_enabled             === false &&
      continuousWorker.RUNTIME_INVARIANTS.cognitive_execution_allowed === false &&
      continuousWorker.RUNTIME_INVARIANTS.auto_execute_band           === 'none';

    const continuousEnabled = String(
      process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED || 'false'
    ).toLowerCase() === 'true';

    return res.json({
      ok:                        flags.IMPETUS_AIOI_ENABLED,
      runtime_mode:              'operational_only',
      continuous_worker_enabled: continuousEnabled,
      worker_running:            status.worker_running,
      outbox_pending:            metrics.outbox_pending,
      outbox_failed:             metrics.outbox_failed,
      dlq_count:                 metrics.dlq_count,
      latency_p95:               metrics.latency_p95,
      invariants_preserved:      invariantsPreserved,
      runtime_invariants:        continuousWorker.RUNTIME_INVARIANTS,
      aioi_enabled:              flags.IMPETUS_AIOI_ENABLED,
      pilot_tenants_count:       (status.pilot_tenants || []).length,
      run_count:                 status.run_count,
      last_run_at:               status.last_run?.completed_at || null,
      status:                    status.worker_running ? 'RUNNING' : 'IDLE',
      timestamp:                 new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({
      ok:                        false,
      runtime_mode:              'operational_only',
      continuous_worker_enabled: false,
      worker_running:            false,
      outbox_pending:            0,
      outbox_failed:             0,
      dlq_count:                 0,
      latency_p95:               0,
      invariants_preserved:      true,
      status:                    'ERROR',
      error:                     err.message,
      timestamp:                 new Date().toISOString()
    });
  }
});

// ─── GET /api/aioi/runtime/metrics ────────────────────────────────────────

router.get('/metrics', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const snapshot = await metricsService.getMetricsSnapshot();
    return res.json(snapshot);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/aioi/runtime/status ─────────────────────────────────────────

router.get('/status', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const status = continuousWorker.getWorkerStatus();
    return res.json(status);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
