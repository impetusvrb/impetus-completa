'use strict';

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m1EnterpriseRemainingCertificationService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1EnterpriseRemaining]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.20' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runM120Certification()) });
}));

router.get('/esg', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.auditEsgEnterprise()) });
}));

router.get('/workflow', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.auditWorkflowBpmn()) });
}));

router.get('/foundation', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.auditFoundationMaturity() });
}));

module.exports = router;
