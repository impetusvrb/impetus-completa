'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../dashboardDensity/dashboardDensityFacade');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function ctxFromReq(req) {
  return {
    ...req.body,
    tenant_id: req.query.tenant_id,
    domain_axis: req.query.axis || req.body?.functional_axis,
    hierarchy_level: req.query.level ? Number(req.query.level) : req.body?.hierarchy_level,
    generic_dashboard: req.query.generic === '1',
    widgets: req.body?.widgets
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getDashboardDensityStatus(ctxFromReq(req)) }));
router.get('/readiness', (req, res) => {
  const s = facade.superviseContextualDensity(ctxFromReq(req));
  res.json({ ok: true, density_governance_ready: s.density_governance_ready, analysis: s.analysis });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getDashboardDensityReport(ctxFromReq(req)));
});

module.exports = router;
