'use strict';

/**
 * M1.14 — M2 Readiness Governance Routes
 *
 * READ ONLY · GET only · Governance assessment for M2 evolution
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m2ReadinessGovernanceService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1Governance]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.14' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runM2ReadinessGovernanceAssessment();
  res.json({ ok: true, phase: 'M1.14', ...result });
}));

router.get('/evidence', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.reviewConsolidatedEvidence()) });
}));

router.get('/risks', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessAdoptionRisks()) });
}));

router.get('/dependencies', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.assessM2Dependencies() });
}));

router.get('/recommendation', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessGovernanceRecommendation()) });
}));

module.exports = router;
