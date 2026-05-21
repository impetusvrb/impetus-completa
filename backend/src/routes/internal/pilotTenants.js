'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../pilotTenants/pilotTenantFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getPilotTenantStatus() }));
router.get('/readiness', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...facade.supervisePilotTenant(tenantId, req.user, req.body).readiness });
});
router.get('/visibility', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const s = facade.supervisePilotTenant(tenantId, req.user, req.body);
  res.json({ ok: true, registry: s.registry, readiness: s.readiness });
});
router.get('/rollback', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...facade.supervisePilotTenant(tenantId, req.user, req.body).rollback });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getPilotTenantReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});
router.post('/activate/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  if (req.body?.execute !== true) return res.status(400).json({ ok: false, error: 'execute=true obrigatório' });
  const result = facade.coordinatePilotMenuActivation(req.params.tenant, req.user, {
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
  res.json(facade.rollbackPilotMenu(req.params.tenant, { ...req.body, approved_by, execute: true }));
});

module.exports = router;
