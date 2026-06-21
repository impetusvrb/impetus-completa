'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../operationalIdentityGovernance/operationalIdentityGovernanceFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getOperationalIdentityGovernanceStatus(req.query) }));
router.get('/readiness', (req, res) => res.json(facade.assessIdentityReadiness(req.user, { ...req.body, tenant_id: req.query.tenant_id })));
router.get('/targeting', (req, res) => res.json(facade.assessIdentityReadiness(req.user, { ...req.body, visible_modules: req.query.modules?.split(',') })));
router.get('/hierarchy', (req, res) => {
  const pack = facade.resolveGovernedIdentityForUser(req.user, req.body);
  res.json({ ok: true, hierarchy: pack.hierarchy, canonical_identity: pack.canonical_identity });
});
router.get('/governance', (req, res) => res.json(facade.getOperationalIdentityGovernanceReport(req.user, { tenant_id: req.query.tenant_id, ...req.body })));
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getOperationalIdentityGovernanceReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
