'use strict';

const express = require('express');
const router = express.Router();
const { protectAgainstUnderdelivery } = require('../../underdeliveryProtection/underdeliveryProtectionFacade');

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
    protection: require('../../pilotTenants/config/phaseZ3FeatureFlags').isUnderdeliveryProtectionEnabled()
  });
});
router.get('/underdelivery', (req, res) => {
  const modules = req.body?.visible_modules || req.query.modules?.split(',').filter(Boolean);
  res.json({ ok: true, ...protectAgainstUnderdelivery(modules, req.body) });
});
router.get('/report', (req, res) => {
  const modules = req.body?.visible_modules || [];
  res.json({ ok: true, ...protectAgainstUnderdelivery(modules, req.body) });
});

module.exports = router;
