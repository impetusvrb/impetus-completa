'use strict';

const express = require('express');
const router = express.Router();
const obs = require('../../kpiPilotObservability/kpiPilotObservabilityFacade');

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

router.get('/status', (req, res) => res.json({ ok: true, ...obs.getKpiPilotObservabilityStatus(req.query) }));
router.get('/leakage', (req, res) => {
  const r = obs.getKpiPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body });
  res.json({ ok: true, leakage: r.leakage });
});
router.get('/underdelivery', (req, res) => {
  const r = obs.getKpiPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body });
  res.json({ ok: true, underdelivery: r.underdelivery });
});
router.get('/targeting', (req, res) => {
  const stab = require('../../kpiTargetingStabilization/kpiTargetingStabilizationFacade');
  res.json({
    ok: true,
    targeting: stab.analyzeKpiTargetingStability(req.user, req.body?.kpis || [], req.body)
  });
});
router.get('/convergence', (req, res) => {
  const r = obs.getKpiPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body });
  res.json({ ok: true, runtime: r.runtime, rollback: r.rollback });
});
router.get('/degradation', (req, res) => {
  const r = obs.getKpiPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body });
  res.json({ ok: true, degradation_safe: r.runtime?.degradation_safe !== false });
});
router.get('/rollback', (req, res) => {
  const r = obs.getKpiPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body });
  res.json({ ok: true, rollback: r.rollback });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(obs.getKpiPilotObservabilityReport(req.user, { tenant_id: req.query.tenant_id, ...req.body }));
});

module.exports = router;
