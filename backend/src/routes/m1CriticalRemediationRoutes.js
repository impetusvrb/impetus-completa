'use strict';

/**
 * M1.16 — Critical Remediation Routes (READ ONLY assessment)
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m1CriticalRemediationService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1CriticalRemediation]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.16' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runCriticalRemediationAssessment()) });
}));

router.get('/financial', asyncWrap(async (_req, res) => {
  const [rbac, denial] = await Promise.all([
    svc.assessFinancialRbac(),
    svc.assessFinancialEmptyResponses(),
  ]);
  res.json({ ok: true, rbac, denial });
}));

router.get('/production', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.assessProductionPromotion() });
}));

router.get('/quality', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.assessQualityPromotion() });
}));

router.get('/regression', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessRegressionValidation()) });
}));

module.exports = router;
