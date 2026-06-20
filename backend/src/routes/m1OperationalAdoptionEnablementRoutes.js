'use strict';

/**
 * M1.21 — Operational Adoption Enablement Routes
 * READ ONLY · GET only
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m1OperationalAdoptionEnablementService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1OperationalAdoptionEnablement]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.21' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runM121OperationalAdoptionEnablement()) });
}));

router.get('/esg', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessEsgOperationalEnablement()) });
}));

router.get('/workflow', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessWorkflowBpmnActivationPath()) });
}));

router.get('/foundation', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessFoundationOperationalMapping()) });
}));

router.get('/readiness', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessAdoptionReadinessScore()) });
}));

module.exports = router;
