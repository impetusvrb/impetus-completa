'use strict';

const express = require('express');
const router = express.Router();
const blindness = require('../../kpiBlindness/kpiBlindnessFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...blindness.getKpiBlindnessStatus(req.query) }));
router.get('/blindness', (req, res) => res.json({ ok: true, ...blindness.detectKpiBlindness(req.body?.kpis || [], req.body) }));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, blindness: blindness.detectKpiBlindness(req.body?.kpis || [], req.body) });
});

module.exports = router;
