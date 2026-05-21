'use strict';

const express = require('express');
const router = express.Router();
const kpi = require('../../kpiEnforcementPreparation/kpiPreparationFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...kpi.getKpiPreparationStatus(req.query) }));
router.get('/readiness', (req, res) => {
  const prep = kpi.prepareKpiEnforcement(req.user, req.body?.kpis || req.body, req.body);
  res.json({ ok: true, readiness: prep.readiness, simulation_only: true });
});
router.get('/leakage', (req, res) => {
  const prep = kpi.prepareKpiEnforcement(req.user, req.body, req.body);
  res.json({ ok: true, leakage_detected: prep.leakage_detected, would_hide: prep.visibility_simulation?.would_hide });
});
router.get('/underdelivery', (req, res) => {
  const prep = kpi.prepareKpiEnforcement(req.user, req.body, req.body);
  res.json({ ok: true, underdelivery: prep.underdelivery });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, preparation: kpi.prepareKpiEnforcement(req.user, req.body, req.body) });
});

module.exports = router;
