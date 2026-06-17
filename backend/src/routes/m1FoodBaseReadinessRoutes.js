'use strict';

/**
 * M1.8 — Food Base Go-Live Readiness Routes
 *
 * READ ONLY · GET only · SIMULATION ONLY · NO DATABASE WRITES
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/foodBaseOnboardingReadinessService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1FoodBase]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.8' });
    });
  };
}

router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runFoodBaseGoLiveReadiness();
  res.json({ ok: true, phase: 'M1.8', ...result });
}));

router.get('/tenant', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessTenantReadiness()) });
}));

router.get('/security', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...svc.assessSecurityReadiness() });
}));

router.get('/roles', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessRoleReadiness()) });
}));

router.get('/permissions', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.assessPermissionReadiness()) });
}));

router.get('/executive', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.simulateExecutiveOnboarding()) });
}));

router.get('/safety', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.simulateSafetyOnboarding()) });
}));

router.get('/environment', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.simulateEnvironmentOnboarding()) });
}));

router.get('/hr', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.simulateHROnboarding()) });
}));

router.get('/financial', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.simulateFinancialOnboarding()) });
}));

router.get('/maintenance', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.simulateMaintenanceOnboarding()) });
}));

module.exports = router;
