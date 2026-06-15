'use strict';

/**
 * P0B.8 — Continuous Operation Observation API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const observation = require('../../services/operations/continuousOperationObservationService');
const registry = require('../../services/operations/continuousObservationRegistryService');

function _windowDays(req) {
  const n = parseInt(req.query.window_days, 10);
  return Number.isFinite(n) && n > 0 ? n : observation.DEFAULT_WINDOW_DAYS;
}

router.get('/status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const obs = await observation.generateContinuousObservation({
      db,
      windowDays: _windowDays(req)
    });
    await registry.collectAndRegisterSnapshot(db, { windowDays: _windowDays(req) });
    return res.json(observation.getObservationStatusSnapshot(obs));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/ingestion', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await observation.observeIngestion(db, { windowDays: _windowDays(req) });
    return res.json({
      ok: true,
      layer: observation.LAYER,
      read_only: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/workflows', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await observation.observeWorkflows(db, { windowDays: _windowDays(req) });
    return res.json({
      ok: true,
      layer: observation.LAYER,
      read_only: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/ai', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await observation.observeAI(db, { windowDays: _windowDays(req) });
    return res.json({
      ok: true,
      layer: observation.LAYER,
      read_only: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/platform', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const data = observation.observePlatform();
    return res.json({
      ok: true,
      layer: observation.LAYER,
      read_only: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/registry', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    await registry.collectAndRegisterSnapshot(db, { windowDays: _windowDays(req) });
    const history = registry.getRegistryHistory(req.query.limit);
    return res.json(history);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
