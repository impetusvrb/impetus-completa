'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../operationalIdentity/operationalIdentityFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getOperationalIdentityStatus({ tenant_id: req.query.tenant_id }) }));
router.get('/targeting', (req, res) => {
  const r = facade.resolveIdentityForUser(req.user, {
    visible_modules: req.body?.visible_modules,
    profile_code: req.query.profile
  });
  res.json({ ok: true, targeting: r.authority_registry, canonical_identity: r.canonical_identity, auto_apply: false });
});
router.get('/authority', (req, res) => {
  const r = facade.resolveIdentityForUser(req.user, req.body || {});
  res.json({ ok: true, hierarchy: r.hierarchy, role_scope: r.role_scope, auto_apply: false });
});
router.get('/hierarchy', (req, res) => {
  const r = facade.resolveIdentityForUser(req.user, req.body || {});
  res.json({ ok: true, ...r.hierarchy });
});
router.get('/tenants', (req, res) => res.json({ ok: true, ...facade.resolveIdentityForUser(req.user, { tenant_id: req.query.tenant_id }) }));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getOperationalIdentityReport(req.user, {
    visible_modules: req.body?.visible_modules,
    profile_code: req.query.profile,
    tenant_id: req.query.tenant_id
  }));
});

module.exports = router;
