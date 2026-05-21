'use strict';

const express = require('express');
const router = express.Router();
const health = require('../../pilotTenantHealth/pilotTenantHealthFacade');
const production = require('../../productionRuntimeActivation/productionRuntimeActivationFacade');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...health.getPilotTenantHealthStatus(req.query) }));
router.get('/health', (req, res) => {
  const p = production.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, ...p.pilot_tenant_health });
});
router.get('/usefulness', (req, res) => {
  const p = production.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, usefulness: p.runtime_observation_consolidation?.usefulness });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const p = production.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, health: p.pilot_tenant_health, production: p.production_runtime_activation });
});

module.exports = router;
