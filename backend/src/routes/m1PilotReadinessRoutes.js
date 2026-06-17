'use strict';

/**
 * M1.7 — Pilot Readiness Simulation Routes
 *
 * READ ONLY · GET only · No mutations
 * AIOI · Truth Program · P0A–P0E · TRI-AI preserved
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/pilotReadinessSimulationService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PilotReadiness]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.7' });
    });
  };
}

/** GET /api/m1/pilot-readiness/status — full simulation */
router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runPilotReadinessSimulation();
  res.json({ ok: true, phase: 'M1.7', ...result });
}));

/** GET /api/m1/pilot-readiness/safety */
router.get('/safety', asyncWrap(async (_req, res) => {
  const result = await svc.simulateSafetyJourney();
  res.json({ ok: true, ...result });
}));

/** GET /api/m1/pilot-readiness/environment */
router.get('/environment', asyncWrap(async (_req, res) => {
  const result = await svc.simulateEnvironmentJourney();
  res.json({ ok: true, ...result });
}));

/** GET /api/m1/pilot-readiness/maintenance */
router.get('/maintenance', asyncWrap(async (_req, res) => {
  const result = await svc.simulateMaintenanceJourney();
  res.json({ ok: true, ...result });
}));

/** GET /api/m1/pilot-readiness/hr */
router.get('/hr', asyncWrap(async (_req, res) => {
  const result = await svc.simulateHRJourney();
  res.json({ ok: true, ...result });
}));

/** GET /api/m1/pilot-readiness/financial */
router.get('/financial', asyncWrap(async (_req, res) => {
  const result = await svc.simulateFinancialJourney();
  res.json({ ok: true, ...result });
}));

/** GET /api/m1/pilot-readiness/executive */
router.get('/executive', asyncWrap(async (_req, res) => {
  const result = await svc.simulateExecutiveJourney();
  res.json({ ok: true, ...result });
}));

module.exports = router;
