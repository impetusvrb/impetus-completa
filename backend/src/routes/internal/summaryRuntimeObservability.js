'use strict';

const express = require('express');
const router = express.Router();
const obs = require('../../summaryRuntimeObservability/summaryRuntimeObservabilityFacade');
const activation = require('../../summaryRuntimeActivation/summaryRuntimeActivationFacade');

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
  const flags = require('../../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
  res.json({ ok: true, phase: 'Z.9', observability: flags.isSummaryRuntimeObservabilityEnabled() });
});
router.get('/timeline', (req, res) => {
  const t = require('../../summaryRuntimeObservability/summaryRuntimeTimeline');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, timeline: t.buildSummaryRuntimeTimeline(tenantId, req.body) });
});
router.get('/health', (req, res) => {
  const p = activation.applySummaryRuntimeActivation(req.user, req.body, { tenant_id: req.query.tenant_id, ...req.body });
  res.json({ ok: true, health: p.summary_runtime_health, observability: p.summary_runtime_observability });
});
router.get('/rollback', (req, res) => {
  const r = require('../../summaryRuntimeObservability/summaryRollbackReadiness');
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...r.getSummaryRollbackObservability(tenantId, req.body) });
});
router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const p = activation.applySummaryRuntimeActivation(req.user, req.body, req.body);
  res.json({
    ok: true,
    observability: p.summary_runtime_observability,
    health: p.summary_runtime_health,
    activation: p.summary_runtime_activation
  });
});

module.exports = router;
