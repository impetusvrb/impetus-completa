'use strict';

/**
 * P0D.8 — Runtime Stabilization API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const runtime = require('../../services/operations/runtimeActivationValidationService');
const registry = require('../../services/operations/runtimeStabilizationRegistryService');

function _opts(req) {
  return {
    windowHours: req.query.window_hours ? parseInt(req.query.window_hours, 10) : undefined,
    earlyWindowMinutes: req.query.early_window_minutes
      ? parseInt(req.query.early_window_minutes, 10)
      : undefined
  };
}

async function _fullReport(req) {
  return runtime.generateRuntimeStabilizationValidation({ db, ..._opts(req) });
}

router.get('/status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    await registry.collectAndRegisterSnapshot(db, _opts(req));
    return res.json(runtime.getRuntimeStatusSnapshot(report));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/activation', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    return res.json({
      ok: report.activation?.runtime_activated ?? false,
      read_only: true,
      ...report.activation,
      pass: report.pass,
      reason: report.reason,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/stabilization', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    if (!report.activation?.runtime_activated) {
      return res.json({ ok: false, read_only: true, reason: report.reason });
    }
    return res.json({
      ok: true,
      read_only: true,
      early_flow: report.early_flow,
      stabilization: report.stabilization,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/health', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const health = await runtime.certifyRuntimeHealth(db);
    return res.json({ ok: health.runtime_health_ok, read_only: true, ...health, timestamp: new Date().toISOString() });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/registry', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    await registry.collectAndRegisterSnapshot(db, _opts(req));
    return res.json(registry.getRegistryHistory(req.query.limit));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
