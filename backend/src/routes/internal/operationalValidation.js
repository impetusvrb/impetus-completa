'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../operationalValidation/operationalConvergenceFacade');
const persistence = require('../../operationalValidation/tenantActivationPersistence');
const reactivation = require('../../operationalValidation/pilotReactivationCoordinator');

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
  res.json({ ok: true, ...facade.getOperationalValidationStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/freeze-state', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateRuntimeFreezeState(req.body?.payload || {})
  });
});

router.get('/refresh', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateRefreshDeterminism(req.body?.payload || {}, req.body?.ctx || {})
  });
});

router.get('/determinism', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateRefreshDeterminism(req.body?.payload || {}, { ...req.body?.ctx, include_snapshots: true })
  });
});

router.get('/domains', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateDomainIsolation(req.body?.payload || {}, {
      profile: req.query.profile,
      validate_all_profiles: req.query.all === 'true'
    })
  });
});

router.get('/kpis', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateKpiGovernance(req.body?.kpis || [], req.body?.ctx || {})
  });
});

router.get('/summaries', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateSummaryGovernance(req.body?.summary || req.body?.payload || {}, req.body?.ctx || {})
  });
});

router.get('/underdelivery', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateUnderdeliveryRisk(req.body?.payload || {}, req.body?.ctx || {})
  });
});

router.get('/cockpit', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateCockpitOperational(req.body?.payload || {}, req.body?.ctx || {})
  });
});

router.get('/pilots', (req, res) => {
  res.json({ ok: true, tenants: persistence.listPersistedTenants() });
});

router.post('/pilots/record', express.json(), (req, res) => {
  const tenantId = req.body?.tenant_id || req.query.tenant_id;
  const r = reactivation.recordPilotActivation(tenantId, req.body || {});
  res.json({ ok: true, ...r });
});

router.post('/pilots/reactivate', express.json(), (req, res) => {
  const tenantId = req.body?.tenant_id || req.query.tenant_id;
  const r = reactivation.coordinateSupervisedReactivation(tenantId, req.user, req.body || {});
  res.json({ ok: true, ...r });
});

router.get('/reload-recovery', (req, res) => {
  const r = reactivation.recoverApprovedPilotsOnBoot({
    force_recovery: req.query.force === 'true'
  });
  res.json({ ok: true, ...r });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    operational_convergence_report: facade.buildOperationalConvergenceReport(
      req.body?.payload || {},
      { tenant_id: req.query.tenant_id, ...req.body?.ctx }
    )
  });
});

module.exports = router;
