'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../realTenantEnforcement/realTenantEnforcementFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getRealTenantEnforcementStatus(req.query) }));
router.get('/readiness', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...facade.superviseRealTenantEnforcement(tenantId, req.user, req.body) });
});
router.get('/governance', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, supervision: facade.superviseRealTenantEnforcement(tenantId, req.user, req.body) });
});
router.get('/stability', (req, res) => {
  const p = facade.applyRealEnforcementToDashboard(req.user, {}, req.body);
  res.json({ ok: true, menu: p.real_tenant_enforcement?.menu });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getRealTenantEnforcementReport(req.user, { tenant_id: req.query.tenant_id, legacy: req.body?.legacy, ...req.body }));
});
router.post('/activate/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by || req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true e approved_by obrigatórios' });
  }
  const result = facade.activateRealTenantEnforcement(req.params.tenant, req.user, {
    ...req.body,
    approved_by,
    execute: true
  });
  res.status(result.activated ? 200 : 409).json({ ok: result.activated, ...result });
});
router.post('/rollback/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by || req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true e approved_by obrigatórios' });
  }
  res.json({ ok: true, ...facade.rollbackRealTenantEnforcement(req.params.tenant, { ...req.body, approved_by, execute: true }) });
});

module.exports = router;
