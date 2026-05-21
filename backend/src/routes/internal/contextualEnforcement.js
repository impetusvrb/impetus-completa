'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../contextualEnforcement/contextualEnforcementFacade');

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
    tenant_id: req.query.tenant_id || req.body?.tenant_id || req.user?.company_id,
    profile_code: req.query.profile || req.body?.profile_code,
    functional_axis: req.query.axis || req.body?.functional_axis,
    visible_modules: req.body?.visible_modules || req.query.modules?.split(',').filter(Boolean),
    hierarchy_level: req.query.level ? Number(req.query.level) : req.body?.hierarchy_level,
    force_simulation: req.query.simulate === '1'
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getContextualEnforcementStatus(ctxFromReq(req)) }));
router.get('/readiness', (req, res) => {
  const prep = facade.prepareContextualEnforcement(req.user, ctxFromReq(req));
  res.json({ ok: true, visibility: prep.visibility, tenant_readiness: prep.tenant_readiness });
});
router.get('/leakage', (req, res) => {
  const prep = facade.prepareContextualEnforcement(req.user, ctxFromReq(req));
  res.json({ ok: true, targeting: prep.targeting, domain_boundary: prep.domain_boundary });
});
router.get('/conflicts', (req, res) => {
  const prep = facade.prepareContextualEnforcement(req.user, ctxFromReq(req));
  res.json({ ok: true, ...prep.conflicts });
});
router.get('/hierarchy', (req, res) => {
  const prep = facade.prepareContextualEnforcement(req.user, ctxFromReq(req));
  res.json({ ok: true, ...prep.hierarchy, matrix: prep.hierarchy_matrix });
});
router.get('/visibility', (req, res) => {
  const prep = facade.prepareContextualEnforcement(req.user, ctxFromReq(req));
  res.json({ ok: true, visibility: prep.visibility, matrix: prep.matrix });
});
router.get('/pruning-simulation', (req, res) => {
  const prep = facade.prepareContextualEnforcement(req.user, { ...ctxFromReq(req), force_simulation: true });
  res.json({ ok: true, pruning: prep.pruning, simulation: prep.pruning_simulation, auto_remove: false });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getContextualEnforcementReport(req.user, ctxFromReq(req)));
});

module.exports = router;
