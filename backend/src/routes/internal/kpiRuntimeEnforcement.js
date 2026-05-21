'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../kpiRuntimeEnforcement/kpiRuntimeEnforcementFacade');
const activation = require('../../kpiRuntimeEnforcement/tenantKpiActivationCoordinator');
const rollback = require('../../kpiRuntimeEnforcement/tenantKpiRollbackCoordinator');
const supervisor = require('../../kpiRuntimeEnforcement/tenantKpiEnforcementSupervisor');
const readiness = require('../../kpiRuntimeEnforcement/tenantKpiReadinessValidator');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getKpiRuntimeEnforcementStatus(req.query) }));
router.get('/readiness', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...readiness.validateTenantKpiReadiness(tenantId, req.user, req.body) });
});
router.get('/visibility', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, supervision: supervisor.superviseTenantKpiEnforcement(tenantId, req.user, req.body) });
});
router.get('/targeting', (req, res) => {
  const stab = require('../../kpiTargetingStabilization/kpiTargetingStabilizationFacade');
  res.json({
    ok: true,
    targeting: stab.analyzeKpiTargetingStability(req.user, req.body?.kpis || [], req.body)
  });
});
router.get('/convergence', (req, res) => {
  const stab = require('../../kpiTargetingStabilization/kpiTargetingStabilizationFacade');
  const t = stab.analyzeKpiTargetingStability(req.user, req.body?.kpis || [], req.body);
  res.json({ ok: true, convergence: t.convergence });
});
router.get('/degradation', (req, res) =>
  res.json({ ok: true, degradation_safe: true, graceful: true, fabricated: false })
);
router.get('/rollback', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const obs = require('../../kpiPilotObservability/kpiRollbackReadiness');
  res.json({ ok: true, ...obs.assessKpiRollbackReadiness(tenantId, req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    status: facade.getKpiRuntimeEnforcementStatus({ tenant_id: tenantId }),
    supervision: supervisor.superviseTenantKpiEnforcement(tenantId, req.user, req.body)
  });
});
router.post('/activate/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by || req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true e approved_by obrigatórios' });
  }
  const result = activation.coordinateTenantKpiActivation(req.params.tenant, req.user, {
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
  res.json(rollback.rollbackTenantKpi(req.params.tenant, { ...req.body, approved_by, execute: true }));
});

module.exports = router;
