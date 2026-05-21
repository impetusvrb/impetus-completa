'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../contextualActivation/contextualActivationFacade');
const supervisor = require('../../contextualActivation/tenantContextualEnforcementSupervisor');

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

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getContextualActivationStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/readiness', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const check = supervisor.canActivateTenantEnforcement(tenantId, req.user, {
    ...req.body,
    visible_modules: req.body?.visible_modules,
    force_activation: req.query.force === '1'
  });
  res.json({ ok: true, ...check });
});

router.get('/tenants', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    ...supervisor.superviseTenantEnforcement(tenantId, req.user, req.body || {})
  });
});

router.get('/enforcement', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const state = require('../../contextualActivation/tenantEnforcementState').getTenantEnforcementState(tenantId);
  res.json({ ok: true, tenant_id: tenantId, state });
});

router.get('/rollback', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const rb = require('../../contextualActivation/tenantEnforcementRollbackReadiness');
  res.json({ ok: true, ...rb.assessTenantEnforcementRollbackReadiness(tenantId, req.body) });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getContextualActivationReport(req.user, {
    ...req.body,
    tenant_id: req.query.tenant_id
  }));
});

router.post('/activate/:tenant', (req, res) => {
  const tenantId = req.params.tenant;
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  if (req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true obrigatório' });
  }
  const result = facade.activateTenantEnforcement(tenantId, req.user, {
    ...req.body,
    approved_by,
    execute: true,
    visible_modules: req.body?.visible_modules
  });
  res.status(result.activated ? 200 : 409).json({ ok: result.activated, ...result });
});

router.post('/deactivate/:tenant', (req, res) => {
  const tenantId = req.params.tenant;
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  if (req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true obrigatório' });
  }
  const result = facade.deactivateTenantEnforcement(tenantId, {
    approved_by,
    execute: true
  });
  res.json({ ok: result.deactivated, ...result });
});

module.exports = router;
