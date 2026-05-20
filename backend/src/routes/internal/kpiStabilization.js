'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../kpiStabilization/kpiStabilizationFacade');
const { superviseKpiLeakage } = require('../../kpiStabilization/leakageSupervisor');
const { superviseKpiUnderdelivery } = require('../../kpiStabilization/underdeliverySupervisor');
const { superviseHierarchyIntegrity } = require('../../kpiStabilization/hierarchyIntegritySupervisor');
const { alignKpiSemantics } = require('../../kpiStabilization/kpiSemanticAlignmentEngine');
const { superviseDeliveryPrecision } = require('../../kpiStabilization/deliveryPrecisionSupervisor');
const { superviseTenantStabilization } = require('../../kpiStabilization/tenantStabilizationSupervisor');
const { getStabilizationTelemetry } = require('../../kpiStabilization/kpiStabilizationTelemetry');
const { executeKpiStabilizationDeploy } = require('../../kpiStabilization/kpiStabilizationSafeDeploy');

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

function sampleUser(req) {
  return { ...req.user, functional_axis: req.query.axis || req.body?.functional_axis || req.user?.functional_axis };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getKpiStabilizationStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/precision', (req, res) => {
  res.json({
    ok: true,
    ...superviseDeliveryPrecision(sampleUser(req), samplePayload(req), {
      functional_axis: req.query.axis,
      tenant_id: req.query.tenant_id
    })
  });
});

router.get('/leakage', (req, res) => {
  res.json({
    ok: true,
    ...superviseKpiLeakage(sampleUser(req), samplePayload(req), {
      functional_axis: req.query.axis,
      tenant_id: req.query.tenant_id
    })
  });
});

router.get('/underdelivery', (req, res) => {
  res.json({
    ok: true,
    ...superviseKpiUnderdelivery(sampleUser(req), samplePayload(req), {
      expected_kpi_min: Number(req.query.min) || 1,
      tenant_id: req.query.tenant_id
    })
  });
});

router.get('/hierarchy', (req, res) => {
  res.json({
    ok: true,
    ...facade.stabilizeHierarchyDelivery(sampleUser(req), samplePayload(req), {
      functional_axis: req.query.axis
    })
  });
});

router.get('/semantic-alignment', (req, res) => {
  res.json({
    ok: true,
    ...alignKpiSemantics(sampleUser(req), samplePayload(req), { functional_axis: req.query.axis })
  });
});

router.get('/tenants', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({
    ok: true,
    ...superviseTenantStabilization(tenantId, sampleUser(req), samplePayload(req), {
      functional_axis: req.query.axis
    })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = sampleUser(req);
  const payload = samplePayload(req);
  res.json({
    ok: true,
    status: facade.getKpiStabilizationStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getStabilizationTelemetry(),
    stabilization: facade.enrichKpiRuntimeStabilization(user, payload, { force: true }),
    deploy_dry_run: executeKpiStabilizationDeploy({ dry_run: true, skip_pm2: true, skip_build: true })
  });
});

module.exports = router;
