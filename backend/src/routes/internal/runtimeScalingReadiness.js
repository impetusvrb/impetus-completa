'use strict';

const express = require('express');
const router = express.Router();
const readiness = require('../../runtimeScalingReadiness/runtimeScalingReadinessFacade');
const scaling = require('../../runtimeOperationalScaling/runtimeOperationalScalingFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...readiness.getRuntimeScalingReadinessStatus(req.query) }));
router.get('/readiness', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({ ok: true, ...p.runtime_scaling_readiness });
});
router.get('/stability', (req, res) => {
  const p = scaling.applyRuntimeOperationalScaling(req.user, {}, req.body);
  res.json({ ok: true, stability: p.tenant_expansion_maturity?.scaling_stability });
});
router.get('/report', (req, res) => res.json(scaling.getOperationalScalingReport(req.user, req.body)));

module.exports = router;
