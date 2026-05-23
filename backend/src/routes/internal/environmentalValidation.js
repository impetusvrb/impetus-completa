'use strict';

const express = require('express');
const router = express.Router();
const lv = require('../../cognitiveRuntime/domains/environmental/liveValidation/environmentalLiveValidationFacade');
const { bridgeEnvironmentalTelemetry } = require('../../cognitiveRuntime/domains/environmental/telemetry/environmentalTelemetryBridge');
const { runEnvironmentalGovernanceRuntime } = require('../../cognitiveRuntime/domains/environmental/governance/environmentalGovernanceRuntime');
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
    phase: 'P1-ENV',
    environmental_native: flags.environmentalNativeCockpitMode(),
    governance: flags.isEnvironmentalGovernanceEnabled()
  });
});

router.get('/telemetry', async (req, res) => {
  const t = await bridgeEnvironmentalTelemetry(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, ...t });
});

router.get('/governance', async (req, res) => {
  const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, governance: runEnvironmentalGovernanceRuntime(s) });
});

router.get('/compliance', async (req, res) => {
  const { evaluateRegulatoryCompliance } = require('../../cognitiveRuntime/domains/environmental/compliance/regulatoryComplianceEngine');
  const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, compliance: evaluateRegulatoryCompliance(s) });
});

router.get('/emissions', async (req, res) => {
  const { resolveEmissionsTelemetry } = require('../../cognitiveRuntime/domains/environmental/telemetry/emissionsTelemetryRuntime');
  const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, emissions: resolveEmissionsTelemetry(s) });
});

router.get('/risks', async (req, res) => {
  const { scoreEnvironmentalRisk } = require('../../cognitiveRuntime/domains/environmental/compliance/environmentalRiskScorer');
  const { loadEnvironmentalTenantSignals } = require('../../cognitiveRuntime/domains/environmental/bridge/environmentalSignalLoader');
  const s = await loadEnvironmentalTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, risk: scoreEnvironmentalRisk(s) });
});

router.get('/density', async (req, res) => {
  const report = await lv.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, { force_environmental_live_validation: true }, { consolidated: req.body?.consolidated });
  res.json({ ok: true, environmental_live_validation: report.environmental_live_validation });
});

router.get('/summaries', async (req, res) => res.json({ ok: true, summary: req.body?.payload?.specialized_summary }));

router.get('/performance', (req, res) => res.json({ ok: true, performance_safe: true, phase: 'P1-ENV' }));

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = await lv.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, { force_environmental_live_validation: true, mock_signals: req.body?.mock_signals }, { consolidated: req.body?.consolidated });
  res.json({ ok: true, ...report });
});

module.exports = router;
