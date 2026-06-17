'use strict';

/**
 * M1.11 — Pilot Operation Window Routes
 *
 * READ ONLY · GET only · Real usage audit · No mutations
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/pilotOperationWindowService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PilotOperation]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.11' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runPilotOperationWindowAssessment();
  res.json({ ok: true, phase: 'M1.11', ...result });
}));

router.get('/executive', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessExecutiveActivity()) });
}));

router.get('/financial', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessFinancialActivity()) });
}));

router.get('/hr', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessHrActivity()) });
}));

router.get('/safety', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessSafetyActivity()) });
}));

router.get('/environment', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessEnvironmentActivity()) });
}));

router.get('/maintenance', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessMaintenanceActivity()) });
}));

router.get('/activity', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessTenantActivity()) });
}));

router.get('/runtime', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessRuntimeHealth()) });
}));

module.exports = router;
