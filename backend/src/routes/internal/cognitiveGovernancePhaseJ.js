'use strict';

/**
 * Fase J — Enterprise Governance Operations API (internal).
 * GET  /api/internal/governance/operations/status
 * GET  /api/internal/governance/operations/incidents
 * GET  /api/internal/governance/operations/runtime
 * GET  /api/internal/governance/operations/health
 * GET  /api/internal/governance/operations/rollout
 * POST /api/internal/governance/operations/emergency/prepare
 */

const express = require('express');
const router = express.Router();

const phaseJ = require('../../governanceOperations/config/phaseJFeatureFlags');
const {
  getOperationsStatus,
  getRolloutOperations,
  getHealthOperations,
  getIncidents,
  getRuntime
} = require('../../governanceOperations/governanceOperationsService');
const { prepareEmergency } = require('../../governanceOperations/governanceEmergencyControls');
const {
  orchestrateActivation
} = require('../../governanceOperations/governanceActivationOrchestrator');
const {
  orchestratePromotion
} = require('../../governanceOperations/governancePromotionOrchestrator');
const {
  orchestrateRollbackReadiness
} = require('../../governanceOperations/governanceRollbackOrchestrator');

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
    return res.status(403).json({ ok: false, error: 'Acesso restrito a operações de governança.' });
  }
  next();
}

router.use(requireGovernanceRole);

router.get('/operations/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tenantId = req.query.tenant_id || null;
  const status = getOperationsStatus({
    force: req.query.force === '1',
    tenant_id: tenantId,
    user: req.user
  });
  res.json({ ok: true, ...status });
});

router.get('/operations/incidents', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const incidents = getIncidents({
    severity: req.query.severity,
    type: req.query.type,
    tenant_id: req.query.tenant_id,
    limit: Number(req.query.limit) || 100,
    force: phaseJ.isGovernanceIncidentEngineEnabled()
  });
  res.json({ ok: true, ...incidents });
});

router.get('/operations/runtime', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const runtime = getRuntime({
    tenant_id: req.query.tenant_id,
    user: req.user
  });
  res.json({ ok: true, runtime });
});

router.get('/operations/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const health = getHealthOperations({
    force: req.query.force === '1' || phaseJ.isGovernanceRuntimeHealthEnabled(),
    tenant_id: req.query.tenant_id
  });
  res.json({ ok: true, ...health });
});

router.get('/operations/rollout', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const rollout = getRolloutOperations({ tenant_id: req.query.tenant_id });
  res.json(rollout);
});

router.post('/operations/emergency/prepare', (req, res) => {
  const result = prepareEmergency({
    approved_by: req.user?.id,
    tenant_id: req.body?.tenant_id || req.query.tenant_id,
    scope: req.body?.scope,
    force: req.body?.force === true
  });
  const status = result.prepared ? 200 : 403;
  res.status(status).json({ ok: result.prepared === true, ...result });
});

router.post('/operations/orchestrate/activate/:channel', (req, res) => {
  const result = orchestrateActivation(req.params.channel, {
    tenant_id: req.body?.tenant_id,
    approved_by: req.user?.id,
    execute: req.body?.execute === true,
    user: req.user,
    force: req.body?.force === true
  });
  res.json({ ok: result.orchestrated === true, ...result });
});

router.post('/operations/orchestrate/promote/:channel', (req, res) => {
  const result = orchestratePromotion(req.params.channel, {
    tenant_id: req.body?.tenant_id,
    approved_by: req.user?.id,
    execute: req.body?.execute === true,
    force: req.body?.force === true,
    readiness_opts: req.body?.readiness_opts
  });
  res.json({ ok: result.orchestrated === true, ...result });
});

router.get('/operations/rollback-readiness', (req, res) => {
  const result = orchestrateRollbackReadiness({
    tenant_id: req.query.tenant_id,
    scope: req.query.scope
  });
  res.json({ ok: true, ...result });
});

module.exports = router;
