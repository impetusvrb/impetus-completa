'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/domains/environmental/liveValidation/environmentalLiveValidationFacade');
const { runEnvironmentalGovernanceRuntime } = require('../../cognitiveRuntime/domains/environmental/governance/environmentalGovernanceRuntime');
const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');
const flags = require('../../cognitiveRuntime/config/phaseP1EnvironmentalFeatureFlags');

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
  res.json({
    ok: true,
    phase: 'P1.1',
    regulatory_governance: flags.isRegulatoryGovernanceEnabled(),
    ...facade.getEnvironmentalLiveValidationStatus()
  });
});

router.get('/compliance', async (req, res) => {
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  const pack = runEnvironmentalGovernanceRuntime(s);
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    mock_signals: req.body?.mock_signals
  }, { signal_bundle: s });
  res.json({ ok: true, governance_pack: pack, compliance_validation: report.compliance_validation });
});

router.get('/telemetry', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    mock_signals: req.body?.mock_signals
  });
  res.json({ ok: true, environmental_telemetry_health: report.environmental_telemetry_health });
});

router.get('/governance', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true
  });
  res.json({
    ok: true,
    environmental_governance_health: report.environmental_governance_health,
    regulatory_isolation: report.regulatory_isolation
  });
});

router.get('/density', async (req, res) => {
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    consolidated: req.body?.consolidated
  });
  res.json({ ok: true, density_validation: report.density_validation });
});

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  const pack = runEnvironmentalGovernanceRuntime(s);
  const report = await facade.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, {
    force_environmental_live_validation: true,
    mock_signals: req.body?.mock_signals
  }, { signal_bundle: s, consolidated: req.body?.consolidated });
  res.json({ ok: true, governance_pack: pack, ...report });
});

module.exports = router;
