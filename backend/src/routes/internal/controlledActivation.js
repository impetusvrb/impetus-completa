'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../controlledActivation/controlledActivationFacade');
const { getProductionActivationStatus, assessEnterpriseReadiness } = require('../../controlledActivation/productionActivationOrchestrator');
const { getChannelOrder, getActivatedChannels, getNextExpectedChannel } = require('../../controlledActivation/channelActivationGovernance');
const { superviseTenantActivation } = require('../../controlledActivation/tenantActivationSupervisor');
const { coordinateActivationReadiness } = require('../../controlledActivation/runtimeActivationCoordinator');
const { detectActivationIssues } = require('../../controlledActivation/activationStabilizationEngine');
const { getActivationTelemetry } = require('../../controlledActivation/productionActivationTelemetry');
const { executeSafeDeploySteps } = require('../../controlledActivation/safeProductionDeploy');

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
  res.json({ ok: true, ...getProductionActivationStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/readiness', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = {
    functional_axis: req.query.axis,
    company_id: req.query.tenant_id || req.user?.company_id
  };
  res.json({
    ok: true,
    ...assessEnterpriseReadiness(user, { functional_axis: req.query.axis, force: req.query.force === '1' })
  });
});

router.get('/channels', (req, res) => {
  res.json({
    ok: true,
    order: getChannelOrder(),
    activated: getActivatedChannels(),
    next_expected: getNextExpectedChannel()
  });
});

router.get('/tenants', (req, res) => {
  const tenantId = req.query.tenant_id || req.user?.company_id;
  res.json({ ok: true, tenant_id: tenantId, ...superviseTenantActivation(tenantId) });
});

router.get('/delivery', (req, res) => {
  res.json({
    ok: true,
    ...coordinateActivationReadiness(
      { functional_axis: req.query.axis, company_id: req.query.tenant_id },
      { functional_axis: req.query.axis, visible_modules: (req.query.modules || '').split(',').filter(Boolean) }
    )
  });
});

router.get('/stability', (req, res) => {
  res.json({
    ok: true,
    ...detectActivationIssues({
      leakage_count: Number(req.query.leakage) || 0,
      underdelivery: req.query.underdelivery === '1',
      hierarchy_mismatch: req.query.hierarchy_mismatch === '1',
      interchannel_divergence: req.query.divergence === '1'
    })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    status: getProductionActivationStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getActivationTelemetry(),
    deploy_dry_run: executeSafeDeploySteps({ dry_run: true, skip_pm2: true, skip_build: true })
  });
});

router.post('/activate/:channel', (req, res) => {
  const channel = req.params.channel;
  const tenantId = req.body?.tenant_id || req.query.tenant_id || req.user?.company_id;
  const readiness = coordinateActivationReadiness(req.user, req.body?.context || {});
  const result = facade.activateChannelForTenant(tenantId, channel, {
    execute: req.body?.execute === true,
    approved_by: req.body?.approved_by || req.user?.email || req.user?.id,
    readiness_ok: readiness.readiness_ok,
    stability_ok: readiness.stability_ok
  });
  res.json({ ok: result.activated || result.prepared, ...result, readiness });
});

router.post('/deactivate/:channel', (req, res) => {
  const result = facade.governChannelDeactivation(req.params.channel, {
    execute: req.body?.execute === true,
    approved_by: req.body?.approved_by || req.user?.email || req.user?.id
  });
  res.json({ ok: true, ...result });
});

module.exports = router;
