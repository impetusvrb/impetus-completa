'use strict';

/**
 * M1.9 — Pilot Execution Dry Run Routes
 *
 * READ ONLY · GET only · No mutations
 * Tenant proxy: Fresh & Fit (511f4819) · AIOI · Truth Program · P0A–P0E preserved
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/pilotExecutionDryRunService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PilotExecution]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.9' });
    });
  };
}

/** GET /api/m1/pilot-execution/status — full dry run */
router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runPilotExecutionDryRun();
  res.json({ ok: true, phase: 'M1.9', ...result });
}));

/** GET /api/m1/pilot-execution/ceo */
router.get('/ceo', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.dryRunCeoJourney()) });
}));

/** GET /api/m1/pilot-execution/cfo */
router.get('/cfo', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.dryRunCfoJourney()) });
}));

/** GET /api/m1/pilot-execution/hr */
router.get('/hr', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.dryRunHrJourney()) });
}));

/** GET /api/m1/pilot-execution/safety */
router.get('/safety', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.dryRunSafetyJourney()) });
}));

/** GET /api/m1/pilot-execution/environment */
router.get('/environment', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.dryRunEnvironmentJourney()) });
}));

/** GET /api/m1/pilot-execution/maintenance */
router.get('/maintenance', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.dryRunMaintenanceJourney()) });
}));

/** GET /api/m1/pilot-execution/navigation */
router.get('/navigation', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.dryRunNavigation() });
}));

module.exports = router;
