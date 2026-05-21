'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../productionRuntimeActivation/productionRuntimeActivationFacade');
const coordinator = require('../../productionRuntimeActivation/tenantPilotActivationCoordinator');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getProductionRuntimeActivationStatus(req.query) }));
router.get('/readiness', (req, res) => {
  const v = require('../../productionRuntimeActivation/runtimeActivationSafetyValidator');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...v.validateRuntimeActivationSafety(tenantId, req.body) });
});
router.get('/activation', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    supervision: require('../../productionRuntimeActivation/productionRuntimeActivationSupervisor').superviseProductionRuntimeActivation(
      tenantId,
      req.user,
      req.body
    )
  });
});
router.get('/stability', (req, res) => {
  const p = facade.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, stability: p.production_runtime_activation?.stabilization });
});
router.get('/pressure', (req, res) => {
  const p = facade.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, pressure: p.production_runtime_activation?.stabilization?.pressure });
});
router.get('/entropy', (req, res) => {
  const p = facade.applyProductionRuntimeActivation(req.user, {}, req.body);
  res.json({ ok: true, entropy: p.production_runtime_activation?.stabilization?.entropy });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getProductionRuntimeReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});
router.post('/activate/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by || req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true e approved_by obrigatórios' });
  }
  const result = coordinator.coordinatePilotProductionActivation(req.params.tenant, req.user, {
    ...req.body,
    approved_by,
    execute: true
  });
  res.status(result.activated ? 200 : 409).json({ ok: result.activated, ...result });
});

module.exports = router;
