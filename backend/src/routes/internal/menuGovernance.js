'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../menuGovernance/menuGovernanceFacade');
const identityFacade = require('../../operationalIdentity/operationalIdentityFacade');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function buildCtx(req) {
  const id = identityFacade.resolveIdentityForUser(req.user, {
    visible_modules: req.body?.visible_modules || req.query.modules?.split(',').filter(Boolean),
    profile_code: req.query.profile
  });
  return {
    ...req.body,
    tenant_id: req.query.tenant_id || req.user?.company_id,
    visible_modules: req.body?.visible_modules || req.query.modules?.split(',').filter(Boolean),
    canonical_identity: id.canonical_identity,
    authority_registry: id.authority_registry,
    governed_visible_modules: id.authority_registry?.governed_visible_modules
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getMenuGovernanceStatus(buildCtx(req)) }));
router.get('/leakage', (req, res) => {
  const r = facade.analyzeMenuGovernance(buildCtx(req));
  res.json({ ok: true, shared: r.shared, overdelivery: r.composition.delivery.overdelivery_modules });
});
router.get('/targeting', (req, res) => res.json({ ok: true, ...facade.analyzeMenuGovernance(buildCtx(req)).targeting }));
router.get('/tenants', (req, res) => res.json({ ok: true, ...facade.analyzeMenuGovernance(buildCtx(req)) }));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getMenuGovernanceReport(buildCtx(req)));
});

module.exports = router;
