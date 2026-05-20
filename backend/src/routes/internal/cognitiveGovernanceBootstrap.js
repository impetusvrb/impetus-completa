'use strict';

/**
 * Primeiro deploy operacional — Governance Bootstrap API
 * GET /api/internal/governance/bootstrap/status
 * GET /api/internal/governance/bootstrap/flags
 * GET /api/internal/governance/bootstrap/entrypoints
 * GET /api/internal/governance/bootstrap/shadow
 * GET /api/internal/governance/bootstrap/soft-kpi
 * GET /api/internal/governance/bootstrap/report
 * POST /api/internal/governance/bootstrap/observe/start
 */

const express = require('express');
const router = express.Router();

const {
  getBootstrapStatus,
  getBootstrapFlagPlan,
  startGlobalShadowObservation
} = require('../../governanceBootstrap/governanceBootstrapCoordinator');
const { mapEntrypoints } = require('../../governanceBootstrap/governanceEntrypointMapper');
const { getAggregateSummary } = require('../../governanceBootstrap/governanceShadowRuntimeCollector');
const { evaluateSoftKpiActivation } = require('../../governanceBootstrap/softKpiActivationEvaluator');
const { generateBootstrapReport } = require('../../governanceBootstrap/governanceBootstrapReporter');
const { runPreDeployAudit } = require('../../governanceBootstrap/preDeployGovernanceAudit');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function requireGovernanceRole(req, res, next) {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
}

router.use(requireGovernanceRole);

router.get('/bootstrap/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...getBootstrapStatus({ force: req.query.force === '1' }) });
});

router.get('/bootstrap/flags', (req, res) => {
  res.json({ ok: true, ...getBootstrapFlagPlan() });
});

router.get('/bootstrap/entrypoints', (req, res) => {
  res.json({ ok: true, ...mapEntrypoints({ live: true }) });
});

router.get('/bootstrap/shadow', (req, res) => {
  res.json({ ok: true, aggregate: getAggregateSummary() });
});

router.get('/bootstrap/soft-kpi', (req, res) => {
  res.json({ ok: true, ...evaluateSoftKpiActivation({ force: req.query.force === '1' }) });
});

router.get('/bootstrap/pre-deploy-audit', (req, res) => {
  res.json({ ok: true, ...runPreDeployAudit() });
});

router.get('/bootstrap/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...generateBootstrapReport({ force: true }) });
});

router.post('/bootstrap/observe/start', (req, res) => {
  res.json({
    ok: true,
    ...startGlobalShadowObservation({ tenant_id: req.body?.tenant_id, approved_by: req.user?.id })
  });
});

module.exports = router;
