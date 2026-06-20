'use strict';

/**
 * M1.19 — Enterprise Promotion Routes
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m1EnterprisePromotionService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1EnterprisePromotion]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.19' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runEnterprisePromotion();
  res.json({ ok: true, ...result });
}));

router.get('/global-01', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runGlobal01SecurityRollout()) });
}));

router.get('/global-02', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.runGlobal02TruthClosure() });
}));

router.get('/tel-01', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.runTel01TelemetryRouting() });
}));

router.get('/mes-01', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.runMes01AsyncIngestion() });
}));

router.get('/tenant-fuzz', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.runTenantFuzzGate()) });
}));

module.exports = router;
