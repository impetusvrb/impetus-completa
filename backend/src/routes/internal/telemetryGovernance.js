'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/domains/production/liveValidation/productionLiveValidationFacade');
const { validateTelemetryHealth } = require('../../cognitiveRuntime/domains/production/liveValidation/telemetry/telemetryHealthValidator');
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

router.get('/status', (req, res) => res.json({ ok: true, ...facade.getProductionLiveValidationStatus() }));

router.get('/health', async (req, res) => {
  const signals = await loadProductionTenantSignals(req.user, {
    tenant_id: req.query.tenant_id,
    mock_signals: req.body?.mock_signals
  });
  const v = validateTelemetryHealth(signals, signals.telemetry || {});
  res.json({ ok: true, ...v });
});

router.get('/stale', async (req, res) => {
  const { detectStaleTelemetry } = require('../../cognitiveRuntime/domains/production/liveValidation/telemetry/staleTelemetryDetector');
  const signals = await loadProductionTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, stale: detectStaleTelemetry(signals, signals.telemetry || {}) });
});

router.get('/degraded', async (req, res) => {
  const { analyzeDegradedSignals } = require('../../cognitiveRuntime/domains/production/liveValidation/telemetry/degradedSignalAnalyzer');
  const signals = await loadProductionTenantSignals(req.user, { mock_signals: req.body?.mock_signals });
  res.json({ ok: true, degraded: analyzeDegradedSignals(signals) });
});

router.get('/readiness', async (req, res) => {
  const report = await facade.runProductionLiveValidation(req.user, {}, { force_production_live_validation: true });
  res.json({ ok: true, telemetry_health: report.telemetry_health });
});

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const report = await facade.runProductionLiveValidation(req.user, req.body?.payload || {}, {
    force_production_live_validation: true,
    mock_signals: req.body?.mock_signals
  });
  res.json({ ok: true, telemetry_governance: report.telemetry_governance, telemetry_health: report.telemetry_health });
});

module.exports = router;
