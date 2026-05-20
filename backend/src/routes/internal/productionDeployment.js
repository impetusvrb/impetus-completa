'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../productionDeployment/productionDeploymentFacade');
const orchestrator = require('../../productionDeployment/productionDeploymentOrchestrator');
const { getDeploymentTelemetry } = require('../../productionDeployment/productionDeploymentTelemetry');

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
  res.json({ ok: true, ...facade.getProductionDeploymentStatus() });
});

router.get('/health', (req, res) => {
  const readiness = orchestrator.assessDeploymentReadiness(req.body || {});
  res.json({ ok: true, health: readiness.health, validation: readiness.validation });
});

router.get('/readiness', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    ...orchestrator.assessDeploymentReadiness({
      ...req.body,
      force: req.query.force === '1',
      skip_http_check: req.query.skip_http === '1',
      skip_pm2_check: req.query.skip_pm2 === '1',
      port: Number(req.query.port) || 4000
    })
  });
});

router.get('/rollback', (req, res) => {
  const readiness = orchestrator.assessDeploymentReadiness(req.body || {});
  res.json({ ok: true, ...readiness.rollback });
});

router.get('/runtime', (req, res) => {
  res.json({
    ok: true,
    ...facade.validateRuntimeDeployment({
      ...req.body,
      skip_http_check: req.query.skip_http === '1',
      skip_pm2_check: req.query.skip_pm2 === '1',
      port: Number(req.query.port) || 4000,
      force_validation: req.query.force === '1'
    })
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(facade.getDeploymentReport({
    ...req.body,
    skip_http_check: true,
    skip_pm2_check: true,
    user: req.user
  }));
});

router.post('/deploy/dry', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) {
    return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  }
  const result = orchestrator.orchestrateProductionDeploy({
    ...req.body,
    dry_run: true,
    execute: false,
    approved_by,
    skip_build: req.body?.skip_build !== false,
    skip_http_check: req.body?.skip_http_check !== false,
    skip_pm2_check: true,
    port: req.body?.port || 4000
  });
  res.json({ ok: result.ok !== false, ...result, telemetry: getDeploymentTelemetry() });
});

router.post('/deploy/execute', (req, res) => {
  const approved_by = req.body?.approved_by || req.user?.email || req.user?.id;
  if (!approved_by) {
    return res.status(400).json({ ok: false, error: 'approved_by obrigatório' });
  }
  if (req.body?.execute !== true) {
    return res.status(400).json({ ok: false, error: 'execute=true obrigatório' });
  }
  const result = orchestrator.orchestrateProductionDeploy({
    ...req.body,
    dry_run: false,
    execute: true,
    approved_by,
    port: req.body?.port || 4000
  });
  const status = result.executed ? 200 : result.ok ? 200 : 409;
  res.status(status).json({ ok: result.ok !== false, ...result, telemetry: getDeploymentTelemetry() });
});

module.exports = router;
