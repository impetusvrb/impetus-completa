'use strict';

/**
 * P0E.7 — Go-Live Monitoring API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const goLive = require('../../services/operations/goLiveDetectionService');
const firstDay = require('../../services/operations/firstDayMonitoringService');
const threeDay = require('../../services/operations/threeDayMonitoringService');
const acceptance = require('../../services/operations/productionAcceptanceService');
const registry = require('../../services/operations/goLiveRegistryService');

router.get('/status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await acceptance.generateProductionAcceptance({ db });
    await registry.collectAndRegisterSnapshot(db);
    return res.json(acceptance.getGoLiveStatusSnapshot(report));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/24h', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const detection = await goLive.detectGoLive(db);
    const data = await firstDay.monitorFirst24Hours(db, {
      since: detection.activation_timestamp
    });
    return res.json({
      ok: true,
      read_only: true,
      go_live_detected: detection.go_live_detected,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/72h', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const detection = await goLive.detectGoLive(db);
    const data = await threeDay.monitorFirst72Hours(db, {
      since: detection.activation_timestamp
    });
    return res.json({
      ok: true,
      read_only: true,
      go_live_detected: detection.go_live_detected,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/acceptance', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await acceptance.generateProductionAcceptance({ db });
    return res.json({
      ok: report.pass,
      read_only: true,
      production_accepted: report.production_accepted ?? false,
      criteria: report.criteria,
      go_live: report.go_live,
      first_24h: report.first_24h,
      first_72h: report.first_72h,
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
    await registry.collectAndRegisterSnapshot(db);
    return res.json(registry.getRegistryHistory(req.query.limit));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
