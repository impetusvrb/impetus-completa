'use strict';

const express = require('express');
const router = express.Router();
const { stabilizeDashboard } = require('../../dashboardStabilization/dashboardStabilizationFacade');

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

router.get('/status', (req, res) => {
  res.json({
    ok: true,
    phase: 'Z.3',
    governance: require('../../pilotTenants/config/phaseZ3FeatureFlags').isDashboardGracefulStabilizationEnabled()
  });
});
router.get('/degradation', (req, res) => {
  res.json({ ok: true, ...stabilizeDashboard(req.body || {}, req.user, req.body) });
});
router.get('/preservation', (req, res) => {
  const g = require('../../menuRuntimeStabilization/gracefulMenuPreservation');
  res.json({ ok: true, ...g.preserveGracefulMenu(req.body?.visible_modules || [], req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...stabilizeDashboard(req.body || {}, req.user, req.body) });
});

module.exports = router;
