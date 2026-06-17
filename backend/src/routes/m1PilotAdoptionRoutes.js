'use strict';

/**
 * M1.13 — Pilot Adoption Assessment Routes
 *
 * READ ONLY · GET only · Adoption vs platform diagnosis
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/pilotAdoptionAssessmentService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PilotAdoption]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.13' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runPilotAdoptionAssessment();
  res.json({ ok: true, phase: 'M1.13', ...result });
}));

router.get('/environment', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessEnvironmentAdoption()) });
}));

router.get('/maintenance', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessMaintenanceAdoption()) });
}));

router.get('/utilization', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessPilotUtilization()) });
}));

router.get('/recommendation', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessM2Recommendation()) });
}));

module.exports = router;
