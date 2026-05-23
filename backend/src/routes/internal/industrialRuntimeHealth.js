'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/domains/production/liveValidation/productionLiveValidationFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getProductionLiveValidationStatus() }));

router.get('/cockpit', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, industrial_cockpit_health: report.industrial_cockpit_health });
});

router.get('/performance', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, {}, { force_production_live_validation: true });
  res.json({ ok: true, performance: report.performance });
});

router.get('/pressure', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, {}, { force_production_live_validation: true });
  res.json({ ok: true, pressure: report.performance?.pressure });
});

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    mock_signals: req.body?.mock_signals,
    consolidated: req.body?.consolidated
  });
  res.json({
    ok: true,
    production_live_validation: report.production_live_validation,
    industrial_cockpit_health: report.industrial_cockpit_health
  });
});

module.exports = router;
