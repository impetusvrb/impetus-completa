'use strict';

/**
 * P0C.8 — Active Continuous Operation API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const active = require('../../services/operations/activeContinuousOperationValidationService');

function _windowMinutes(req) {
  const n = parseInt(req.query.window_minutes, 10);
  return Number.isFinite(n) && n > 0 ? n : active.DEFAULT_ACTIVATION_WINDOW_MINUTES;
}

async function _fullReport(req) {
  return active.generateActiveOperationValidation({
    db,
    activationWindowMinutes: _windowMinutes(req)
  });
}

router.get('/status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    return res.json(active.getActiveStatusSnapshot(report));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/ioe', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    if (!report.precondition?.pipeline_activated) {
      return res.json({
        ok: false,
        read_only: true,
        reason: report.reason,
        precondition: report.precondition
      });
    }
    return res.json({ ok: true, read_only: true, ...report.ioe, timestamp: new Date().toISOString() });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/runtime', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    if (!report.precondition?.pipeline_activated) {
      return res.json({
        ok: false,
        read_only: true,
        reason: report.reason,
        precondition: report.precondition
      });
    }
    return res.json({ ok: true, read_only: true, ...report.runtime, timestamp: new Date().toISOString() });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/outbox', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    if (!report.precondition?.pipeline_activated) {
      return res.json({
        ok: false,
        read_only: true,
        reason: report.reason,
        precondition: report.precondition
      });
    }
    return res.json({ ok: true, read_only: true, ...report.outbox, timestamp: new Date().toISOString() });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/stability', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await _fullReport(req);
    return res.json({
      ok: true,
      read_only: true,
      pass: report.pass,
      ...report.stability,
      precondition_met: report.precondition?.pipeline_activated ?? false,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
