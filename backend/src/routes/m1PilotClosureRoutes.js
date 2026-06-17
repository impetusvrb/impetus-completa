'use strict';

/**
 * M1.12 — Pilot Operational Closure Routes
 *
 * READ ONLY · GET only · Tenant-scoped evidence · No mutations
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/pilotOperationalClosureService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PilotClosure]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.12' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runPilotOperationalClosure();
  res.json({ ok: true, phase: 'M1.12', ...result });
}));

router.get('/environment', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessEnvironmentClosure()) });
}));

router.get('/maintenance', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessMaintenanceClosure()) });
}));

router.get('/gate', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.recalculateM2Gate()) });
}));

module.exports = router;
