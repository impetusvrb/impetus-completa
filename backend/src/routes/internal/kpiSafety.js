'use strict';

const express = require('express');
const router = express.Router();
const safety = require('../../kpiSafety/kpiSafetyFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...safety.getKpiSafetyStatus(req.query) }));
router.get('/leakage', (req, res) => {
  const v = safety.validateKpiSafety(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, leakage: v.leakage });
});
router.get('/underdelivery', (req, res) => {
  const v = safety.validateKpiSafety(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, underdelivery: v.underdelivery });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, safety: safety.validateKpiSafety(req.user, req.body?.kpis || [], req.body) });
});

module.exports = router;
