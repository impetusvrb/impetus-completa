'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/domains/production/liveValidation/productionLiveValidationFacade');
const { loadProductionTenantSignals } = require('../../cognitiveRuntime/domains/production/bridge/productionSignalLoader');

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
  res.json({ ok: true, ...facade.getProductionLiveValidationStatus() });
});

router.get('/telemetry', async (req, res) => {
  const signals = await loadProductionTenantSignals(req.user, { tenant_id: req.query.tenant_id });
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    tenant_id: req.query.tenant_id,
    force_production_live_validation: true,
    signal_bundle: signals
  });
  res.json({ ok: true, telemetry_health: report.telemetry_health, telemetry_governance: report.telemetry_governance });
});

router.get('/readiness', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    mock_signals: req.body?.mock_signals
  });
  res.json({ ok: true, telemetry_ready: report.production_live_validation?.telemetry_ready });
});

router.get('/density', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, density_validation: report.density_validation });
});

router.get('/runtime', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    stability_a: req.body?.stability_a,
    stability_b: req.body?.stability_b
  });
  res.json({ ok: true, stability: report.stability, production_live_validation: report.production_live_validation });
});

router.get('/overload', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({
    ok: true,
    overload_detected: report.production_live_validation?.overload_detected,
    density: report.density_validation
  });
});

router.get('/summaries', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, summary_validation: report.summary_validation });
});

router.get('/ai', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, ai_validation: report.ai_validation });
});

router.get('/performance', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    timings: req.body?.timings
  });
  res.json({ ok: true, performance: report.performance });
});

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = await facade.runProductionLiveValidation(
    req.user,
    req.body?.payload || {},
    { tenant_id: req.query.tenant_id, force_production_live_validation: true, mock_signals: req.body?.mock_signals },
    { consolidated: req.body?.consolidated, signal_bundle: req.body?.signal_bundle }
  );
  res.json({ ok: true, ...report });
});

module.exports = router;
