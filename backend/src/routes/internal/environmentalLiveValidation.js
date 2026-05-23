'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/domains/environmental/liveValidation/environmentalLiveValidationFacade');
const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');

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
  res.json({ ok: true, ...facade.getEnvironmentalLiveValidationStatus() });
});

router.get('/compliance', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    mock_signals: req.body?.mock_signals
  });
  res.json({ ok: true, compliance_validation: report.compliance_validation });
});

router.get('/telemetry', async (req, res) => {
  const signals = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    mock_signals: req.body?.mock_signals
  }, { signal_bundle: signals });
  res.json({
    ok: true,
    environmental_telemetry_health: report.environmental_telemetry_health,
    observability: report.environmental_governance_observability
  });
});

router.get('/governance', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    mock_signals: req.body?.mock_signals
  });
  res.json({
    ok: true,
    environmental_governance_health: report.environmental_governance_health,
    regulatory_cockpit_health: report.regulatory_cockpit_health
  });
});

router.get('/density', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, density_validation: report.density_validation, environmental_live_validation: report.environmental_live_validation });
});

router.get('/summaries', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, summary_validation: report.summary_validation });
});

router.get('/ai', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, ai_validation: report.ai_validation });
});

router.get('/performance', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    timings: req.body?.timings
  });
  res.json({ ok: true, performance: report.performance, sustainability_runtime: report.sustainability_runtime });
});

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = await facade.runEnvironmentalLiveValidation(
    req.user,
    req.body?.payload || {},
    { force_environmental_live_validation: true, mock_signals: req.body?.mock_signals },
    { consolidated: req.body?.consolidated, signal_bundle: req.body?.signal_bundle, stability_a: req.body?.stability_a, stability_b: req.body?.stability_b }
  );
  res.json({ ok: true, ...report });
});

module.exports = router;
