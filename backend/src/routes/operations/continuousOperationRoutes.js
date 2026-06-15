'use strict';

/**
 * P0A.6 — Continuous Operation API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const ioeOp = require('../../services/operations/ioeContinuousOperationService');
const observation = require('../../services/operations/operationalObservationRegistryService');

async function _buildReadiness() {
  return ioeOp.assessContinuousOperationReadiness({ db });
}

router.get('/status', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const readiness = await _buildReadiness();
    const obs = await observation.collectObservationSnapshot(db);
    return res.json({
      ok: true,
      layer: 'P0A_CONTINUOUS_OPERATION',
      read_only: true,
      phase: 'P0A',
      verdict: readiness.activation_ready
        ? 'CONTINUOUS_OPERATION_ACTIVATION_READY'
        : 'CONTINUOUS_OPERATION_ACTIVATION_PENDING',
      pass: readiness.blocking_issues === 0,
      activation_ready: readiness.activation_ready,
      continuous_runtime_ready: readiness.continuous_runtime_ready,
      blocking_issues: readiness.blocking_issues,
      observation: obs.dashboard_metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/readiness', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const readiness = await _buildReadiness();
    return res.json(readiness);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/observation', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const windowHours = req.query.window_hours ? parseInt(req.query.window_hours, 10) : 1;
    const obs = await observation.collectObservationSnapshot(db, { windowHours });
    return res.json(obs);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/health', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const readiness = await _buildReadiness();
    const obs = await observation.collectObservationSnapshot(db);
    return res.json({
      ok: readiness.blocking_issues === 0,
      layer: 'P0A_CONTINUOUS_OPERATION_HEALTH',
      read_only: true,
      activation_ready: readiness.activation_ready,
      continuous_runtime_ready: readiness.continuous_runtime_ready,
      blocking_issues: readiness.blocking_issues,
      workers_enabled: readiness.activation_checklist?.workers_enabled ?? false,
      pipeline_enabled: readiness.activation_checklist?.pipeline_enabled ?? false,
      plc_telemetry_active: readiness.pipeline_plc?.plc_telemetry_active ?? false,
      outbox_healthy: readiness.outbox?.healthy ?? false,
      queue_healthy: readiness.queue_health?.queue_healthy ?? false,
      metrics: obs.dashboard_metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
