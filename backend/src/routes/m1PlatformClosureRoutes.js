'use strict';

/**
 * M1.15 — Critical Platform Closure Audit Routes
 *
 * READ ONLY · GET only · Root cause diagnosis (no remediation)
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/m1PlatformClosureAuditService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1PlatformClosure]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.15' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runPlatformClosureAudit();
  res.json({ ok: true, phase: 'M1.15', ...result });
}));

router.get('/financial', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.auditFinancialF48RootCause()) });
}));

router.get('/aioi-worker', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.auditAioiWorkerHealth()) });
}));

router.get('/telemetry', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.auditTelemetryPersistence()) });
}));

router.get('/shadow-runtime', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.auditShadowRuntime() });
}));

module.exports = router;
