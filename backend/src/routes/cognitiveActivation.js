'use strict';

/**
 * Routes /api/cognitive-activation
 *
 * Endpoints de status, telemetria e rollback para a virada de chave
 * dos três componentes cognitivos (SZ2, Fase F, Identity Hardening).
 */

const express = require('express');
const router = express.Router();
const coordinator = require('../activation/cognitiveActivationCoordinator');

/** GET /status — snapshot completo de todos os componentes */
router.get('/status', (req, res) => {
  try {
    const status = coordinator.getStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message ?? 'status_error' });
  }
});

/** GET /operational — health check rápido (é seguro chamar em monitor) */
router.get('/operational', (req, res) => {
  try {
    const op = coordinator.isOperational();
    res.status(op.operational ? 200 : 503).json({ ok: op.operational, ...op });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message ?? 'operational_check_error' });
  }
});

/** GET /readiness — valida flags de ambiente */
router.get('/readiness', (req, res) => {
  try {
    const readiness = coordinator.validateReadiness();
    res.status(readiness.ready ? 200 : 409).json({ ok: readiness.ready, ...readiness });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message ?? 'readiness_error' });
  }
});

/** GET /log — últimas N entradas de telemetria */
router.get('/log', (req, res) => {
  try {
    const log = coordinator.getActivationLog();
    const n = Math.min(parseInt(req.query.n || '50', 10), 200);
    res.json({ ok: true, count: log.length, entries: log.slice(-n) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message ?? 'log_error' });
  }
});

module.exports = router;
