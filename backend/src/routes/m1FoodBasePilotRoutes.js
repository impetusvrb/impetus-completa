'use strict';

/**
 * M1.10 — Food Base Pilot Provisioning Routes
 *
 * GET only · Controlled go-live validation · Truth Program preserved
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/foodBasePilotProvisioningService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1FoodBasePilot]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.10' });
    });
  };
}

/** GET /api/m1/foodbase-pilot/status — full provisioning assessment */
router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.runFoodBasePilotProvisioning();
  res.json({ ok: true, phase: 'M1.10', ...result });
}));

/** GET /api/m1/foodbase-pilot/strategy */
router.get('/strategy', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.determineTenantStrategy()) });
}));

/** GET /api/m1/foodbase-pilot/provisioning */
router.get('/provisioning', asyncWrap(async (_req, res) => {
  const strategy = await svc.determineTenantStrategy();
  res.json({ ok: true, ...(await svc.validateProvisioning(strategy.tenant?.company_id)) });
}));

/** GET /api/m1/foodbase-pilot/pilot-lists */
router.get('/pilot-lists', asyncWrap(async (_req, res) => {
  const strategy = await svc.determineTenantStrategy();
  res.json({ ok: true, ...svc.validatePilotLists(strategy.tenant?.company_id) });
}));

/** GET /api/m1/foodbase-pilot/profiles */
router.get('/profiles', asyncWrap(async (_req, res) => {
  const strategy = await svc.determineTenantStrategy();
  res.json({ ok: true, ...(await svc.validateProfiles(strategy.tenant?.company_id)) });
}));

/** GET /api/m1/foodbase-pilot/executive */
router.get('/executive', asyncWrap(async (_req, res) => {
  const strategy = await svc.determineTenantStrategy();
  res.json({ ok: true, ...(await svc.validateExecutiveGoLive(strategy.tenant?.company_id)) });
}));

/** GET /api/m1/foodbase-pilot/domains */
router.get('/domains', asyncWrap(async (_req, res) => {
  const strategy = await svc.determineTenantStrategy();
  res.json({ ok: true, ...(await svc.validateDomainGoLive(strategy.tenant?.company_id)) });
}));

/** GET /api/m1/foodbase-pilot/aioi */
router.get('/aioi', asyncWrap(async (_req, res) => {
  const strategy = await svc.determineTenantStrategy();
  res.json({ ok: true, ...(await svc.validateAioiTenant(strategy.tenant?.company_id)) });
}));

/** GET /api/m1/foodbase-pilot/foodbase-api */
router.get('/foodbase-api', asyncWrap(async (_req, res) => {
  res.json({ ok: true, ...(await svc.validateFoodbaseApi()) });
}));

module.exports = router;
