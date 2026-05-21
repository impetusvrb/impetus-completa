'use strict';

const express = require('express');
const router = express.Router();
const obs = require('../../pilotObservability/pilotObservabilityFacade');
const targeting = require('../../targetingConvergence/targetingConvergenceFacade');
const stabilization = require('../../pilotOperationalStabilization/pilotOperationalStabilizationFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...obs.getPilotObservabilityStatus(req.query) }));
router.get('/leakage', (req, res) => {
  const report = obs.getPilotObservabilityReport(req.user, req.body);
  res.json({ ok: true, leakage: report.leakage });
});
router.get('/underdelivery', (req, res) => {
  const report = obs.getPilotObservabilityReport(req.user, req.body);
  res.json({ ok: true, underdelivery: report.underdelivery });
});
router.get('/targeting', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    ...targeting.assessTenantTargetingConvergence(tenantId, req.user, req.body)
  });
});
router.get('/convergence', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    convergence: targeting.assessTenantTargetingConvergence(tenantId, req.user, req.body)
  });
});
router.get('/degradation', (req, res) => {
  res.json({
    ok: true,
    degradation_safe: true,
    recommendation_only: true,
    stabilization: stabilization.getOperationalStabilizationStatus()
  });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(obs.getPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
