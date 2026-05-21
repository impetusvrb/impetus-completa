'use strict';

const express = require('express');
const router = express.Router();
const health = require('../../kpiGovernanceHealth/kpiGovernanceHealthFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...health.getKpiGovernanceHealthStatus(req.query) }));
router.get('/governance-health', (req, res) => {
  res.json({ ok: true, ...health.assessKpiGovernanceHealth(req.body?.pack || req.body, req.body) });
});
router.get('/maturity', (req, res) => {
  const h = health.assessKpiGovernanceHealth(req.body?.pack || req.body, req.body);
  res.json({ ok: true, maturity: h.maturity });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, health: health.assessKpiGovernanceHealth(req.body?.pack || req.body, req.body) });
});

module.exports = router;
