'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../summaryRuntimeActivation/summaryRuntimeActivationFacade');
const activation = require('../../summaryRuntimeActivation/summaryActivationCoordinator');
const supervisor = require('../../summaryRuntimeActivation/tenantSummaryRuntimeSupervisor');
const readiness = require('../../summaryRuntimeActivation/tenantSummaryReadinessValidator');
const rollbackReady = require('../../summaryRuntimeActivation/summaryRuntimeRollbackReadiness');

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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getSummaryRuntimeActivationStatus(req.query) }));
router.get('/readiness', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...readiness.validateTenantSummaryReadiness(tenantId, req.user, req.body) });
});
router.get('/activation', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, supervision: supervisor.superviseTenantSummaryRuntime(tenantId, req.user, req.body) });
});
router.get('/narrative', (req, res) => {
  const p = facade.applySummaryRuntimeActivation(req.user, req.body, req.body);
  res.json({ ok: true, narrative: p.summary_runtime_activation?.stability });
});
router.get('/stability', (req, res) => {
  const s = require('../../summaryNarrativeStabilization/narrativeStabilizationFacade');
  res.json({ ok: true, stability: s.stabilizeSummaryNarrative(req.body, req.body) });
});
router.get('/blindness', (req, res) => {
  const b = require('../../summaryBlindness/summaryBlindnessFacade');
  res.json({ ok: true, blindness: b.detectSummaryBlindness(req.body, req.body) });
});
router.get('/underdelivery', (req, res) => {
  const u = require('../../summaryUnderdelivery/summaryUnderdeliveryFacade');
  res.json({ ok: true, underdelivery: u.assessSummaryUnderdelivery(req.body, req.body) });
});
router.get('/targeting', (req, res) => {
  const t = require('../../summaryTargetingHardening/summaryTargetingIntegrityFacade');
  res.json({ ok: true, targeting: t.analyzeSummaryTargetingIntegrity(req.body, req.body) });
});
router.get('/health', (req, res) => {
  const p = facade.applySummaryRuntimeActivation(req.user, req.body, req.body);
  res.json({ ok: true, health: p.summary_runtime_health });
});
router.get('/rollback', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...rollbackReady.assessSummaryRollbackReadiness(tenantId, req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getSummaryRuntimeActivationReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});
router.post('/activate/:tenant', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by || req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true e approved_by obrigatórios' });
  }
  const result = activation.coordinateTenantSummaryActivation(req.params.tenant, req.user, {
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
  res.json(activation.rollbackTenantSummary(req.params.tenant, { ...req.body, approved_by, execute: true }));
});

module.exports = router;
