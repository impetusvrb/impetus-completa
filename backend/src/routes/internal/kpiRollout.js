'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../kpiRollout/kpiRolloutFacade');
const engine = require('../../kpiRollout/kpiGovernanceActivationEngine');
const { detectKpiLeakage } = require('../../kpiRollout/kpiLeakageDetector');
const { stabilizeKpiDelivery } = require('../../kpiRollout/kpiDeliveryStabilization');
const { computeKpiPrecisionRuntime } = require('../../kpiRollout/kpiPrecisionRuntime');
const { superviseTenantKpiRollout } = require('../../kpiRollout/tenantKpiRolloutSupervisor');
const { getKpiGovernanceTelemetry } = require('../../kpiRollout/kpiGovernanceTelemetry');
const { executeKpiGovernanceDeploy } = require('../../kpiRollout/kpiSafeDeploy');
const { READINESS_THRESHOLD } = require('../../kpiRollout/kpiRuntimeActivationCoordinator');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function samplePayload(req) {
  return req.body?.kpis || { kpis: [] };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...engine.getKpiRolloutStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/readiness', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = { ...req.user, functional_axis: req.query.axis || req.user?.functional_axis };
  const readiness = engine.assessKpiRolloutReadiness(user, samplePayload(req), {
    functional_axis: req.query.axis,
    readiness_threshold: Number(req.query.threshold) || READINESS_THRESHOLD,
    force: req.query.force === '1'
  });
  res.json({ ok: true, ...readiness });
});

router.get('/precision', (req, res) => {
  const user = { ...req.user, functional_axis: req.query.axis || req.user?.functional_axis };
  res.json({
    ok: true,
    ...computeKpiPrecisionRuntime(user, samplePayload(req), { functional_axis: req.query.axis })
  });
});

router.get('/leakage', (req, res) => {
  const user = { ...req.user, functional_axis: req.query.axis || req.user?.functional_axis };
  res.json({
    ok: true,
    ...detectKpiLeakage(user, samplePayload(req), { functional_axis: req.query.axis, tenant_id: req.query.tenant_id })
  });
});

router.get('/stability', (req, res) => {
  const user = { ...req.user, functional_axis: req.query.axis || req.user?.functional_axis };
  res.json({
    ok: true,
    ...stabilizeKpiDelivery(user, samplePayload(req), { functional_axis: req.query.axis })
  });
});

router.get('/tenants', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, ...superviseTenantKpiRollout(tenantId) });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    status: engine.getKpiRolloutStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getKpiGovernanceTelemetry(),
    deploy_dry_run: executeKpiGovernanceDeploy({ dry_run: true, skip_pm2: true, skip_build: true })
  });
});

router.post('/activate', (req, res) => {
  const threshold = Number(req.body?.readiness_threshold) || READINESS_THRESHOLD;
  const result = engine.activateKpiGovernance(req.user, req.body?.kpis || { kpis: [] }, {
    execute: req.body?.execute === true,
    approved_by: req.body?.approved_by || req.user?.email || req.user?.id,
    tenant_id: req.body?.tenant_id || req.user?.company_id,
    readiness_threshold: threshold,
    force_readiness: req.body?.force_readiness === true,
    functional_axis: req.body?.functional_axis
  });
  const ok = result.activated || result.prepared;
  res.json({ ok, ...result });
});

router.post('/deactivate', (req, res) => {
  const result = engine.deactivateKpiGovernance({
    execute: req.body?.execute === true,
    approved_by: req.body?.approved_by || req.user?.email || req.user?.id,
    tenant_id: req.body?.tenant_id || req.user?.company_id
  });
  res.json({ ok: true, ...result });
});

module.exports = router;
