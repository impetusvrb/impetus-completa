'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../runtimeCalibration/runtimeCalibrationFacade');
const { calibrateTenantRuntime } = require('../../runtimeCalibration/tenantRuntimeCalibrationEngine');
const { computeOperationalMaturity } = require('../../runtimeCalibration/runtimeOperationalMaturityEngine');
const { consolidateRuntimeGaps } = require('../../runtimeCalibration/runtimeGapConsolidator');
const { superviseTenantStabilization } = require('../../runtimeCalibration/tenantStabilizationSupervisor');
const { adviseRuntimeTuning } = require('../../runtimeCalibration/controlledRuntimeTuningAdvisor');
const { advisePipelineConsolidation } = require('../../runtimeCalibration/pipelineConsolidationAdvisor');
const { calibrateOperationalUsefulness } = require('../../runtimeCalibration/operationalUsefulnessCalibration');
const { getCalibrationTelemetry } = require('../../runtimeCalibration/runtimeCalibrationTelemetry');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getRuntimeCalibrationStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/tenants', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const ctx = req.body || {};
  const usefulness = calibrateOperationalUsefulness(ctx);
  const maturity = computeOperationalMaturity({ ...ctx, operational_usefulness: usefulness });
  const stabilization = superviseTenantStabilization(tenantId, { ...ctx, maturity, tenant_id: tenantId });
  res.json({
    ok: true,
    tenant_id: tenantId,
    ...stabilization,
    maturity: maturity.composite_maturity
  });
});

router.get('/maturity', (req, res) => {
  const usefulness = calibrateOperationalUsefulness(req.body || {});
  res.json({
    ok: true,
    ...computeOperationalMaturity({ ...req.body, operational_usefulness: usefulness })
  });
});

router.get('/gaps', (req, res) => {
  res.json({ ok: true, ...consolidateRuntimeGaps({ ...req.body, tenant_id: req.query.tenant_id }) });
});

router.get('/stability', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    ...superviseTenantStabilization(tenantId, req.body || {})
  });
});

router.get('/tuning', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  const cal = calibrateTenantRuntime(tenantId, req.user, req.body || {});
  res.json({ ok: true, ...cal.tuning });
});

router.get('/pipelines', (req, res) => {
  res.json({ ok: true, ...advisePipelineConsolidation(req.body || {}) });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = { ...req.user, functional_axis: req.query.axis || req.user?.functional_axis };
  res.json({
    ok: true,
    status: facade.getRuntimeCalibrationStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getCalibrationTelemetry(),
    calibration: facade.enrichWithRuntimeCalibration(user, req.body || {}, { force: true })
  });
});

module.exports = router;
