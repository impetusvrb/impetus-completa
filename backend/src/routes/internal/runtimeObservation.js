'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../runtimeObservation/runtimeObservationFacade');
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
  const identityPack = identityFacade.resolveIdentityForUser(req.user, {
    visible_modules: req.body?.visible_modules || req.query.modules?.split(','),
    profile_code: req.query.profile || req.body?.profile_code,
    tenant_id: req.query.tenant_id
  });
  return {
    ...req.body,
    tenant_id: req.query.tenant_id || req.user?.company_id,
    visible_modules: req.body?.visible_modules || req.query.modules?.split(',').filter(Boolean),
    canonical_identity: identityPack.canonical_identity,
    domain_authority: identityPack.domain_authority,
    functional_axis: identityPack.canonical_identity?.functional_axis
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getRuntimeObservationStatus(buildCtx(req)) }));
router.get('/leakage', (req, res) => res.json({ ok: true, ...facade.observeDeliveryLeakage(buildCtx(req)) }));
router.get('/hierarchy', (req, res) => res.json({ ok: true, ...facade.observeHierarchyMismatch(buildCtx(req)) }));
router.get('/authority', (req, res) => res.json({ ok: true, ...facade.observeAuthorityConflicts(buildCtx(req)) }));
router.get('/targeting', (req, res) => {
  const ctx = buildCtx(req);
  res.json({
    ok: true,
    underdelivery: facade.observeContextualUnderdelivery(ctx),
    leakage: facade.observeDeliveryLeakage(ctx)
  });
});
router.get('/genericity', (req, res) => res.json({ ok: true, ...facade.observeDashboardGenericity(buildCtx(req)) }));
router.get('/tenants', (req, res) => res.json({ ok: true, ...facade.observeRuntimeDelivery(buildCtx(req)) }));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRuntimeObservationReport(buildCtx(req)));
});

module.exports = router;
