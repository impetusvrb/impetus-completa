'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../tenantProfiling/tenantProfileFacade');
const identityFacade = require('../../operationalIdentity/operationalIdentityFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getTenantProfilingStatus({ tenant_id: req.query.tenant_id }) }));
router.get('/readiness', (req, res) => {
  const id = identityFacade.resolveIdentityForUser(req.user, req.body || {});
  res.json({ ok: true, ...facade.assessTenantDeliveryReadiness(req.query.tenant_id || req.user?.company_id, id.canonical_identity, req.body) });
});
router.get('/tenants', (req, res) => {
  const id = identityFacade.resolveIdentityForUser(req.user, req.body || {});
  res.json(facade.getTenantProfileReport(req.query.tenant_id || req.user?.company_id, id.canonical_identity, req.body));
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = identityFacade.resolveIdentityForUser(req.user, req.body || {});
  res.json(facade.getTenantProfileReport(req.query.tenant_id || req.user?.company_id, id.canonical_identity, req.body));
});

module.exports = router;
