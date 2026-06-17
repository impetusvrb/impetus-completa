'use strict';

/**
 * M1.17 — Pilot Adoption Closure Routes
 *
 * READ ONLY · GET only · Sem writes
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/pilotAdoptionClosureService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PilotAdoptionClosure]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.17' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runPilotAdoptionClosure()) });
}));

router.get('/environment', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessEnvironmentAdoptionClosure()) });
}));

router.get('/maintenance', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessMaintenanceAdoptionClosure()) });
}));

router.get('/utilization', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessPilotUtilizationClosure()) });
}));

router.get('/gate', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.revalidateOperationalClosure()) });
}));

module.exports = router;
