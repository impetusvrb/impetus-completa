'use strict';

/**
 * Fase I — Controlled Governance Activation API (internal).
 * POST /api/internal/governance/activate/:channel
 * POST /api/internal/governance/demote/:channel
 * GET  /api/internal/governance/activation/status
 * GET  /api/internal/governance/activation/rollback-readiness
 */

const express = require('express');
const router = express.Router();

const phaseI = require('../../governanceActivation/config/phaseIFeatureFlags');
const {
  promoteChannel,
  demoteChannel,
  getRuntimeState,
  resolveChannelActivation
} = require('../../governanceActivation/governanceActivationRuntime');
const { validateActivationRequest } = require('../../governanceActivation/governanceActivationValidator');
const { assessRollbackReadiness, executeRuntimeDemote } = require('../../governanceActivation/governanceRollbackReadiness');
const { planRollout, rollbackRollout } = require('../../governanceActivation/governanceActivationRolloutEngine');
const { getHealthIfMonitoring } = require('../../governanceActivation/governanceRuntimeHealth');
const { assessReadiness } = require('../../governanceReadiness/governanceReadinessEngine');

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

router.get('/activation/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tenantId = req.query.tenant_id || null;
  const channels = ['kpi', 'summary', 'chat', 'boundary'].map((ch) => ({
    channel: ch,
    ...resolveChannelActivation(ch, { tenant_id: tenantId })
  }));
  res.json({
    ok: true,
    flags: {
      controlled_activation: phaseI.isControlledGovernanceActivationEnabled(),
      tenant_safe: phaseI.isTenantSafeGovernanceEnabled(),
      runtime_monitoring: phaseI.isRuntimeGovernanceMonitoringEnabled()
    },
    runtime: getRuntimeState(),
    channels,
    health: getHealthIfMonitoring()
  });
});

router.get('/activation/rollback-readiness', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const readiness = assessRollbackReadiness({
    tenant_id: req.query.tenant_id,
    scope: req.query.scope || 'phase_f_only'
  });
  res.json({ ok: true, ...readiness });
});

router.get('/activation/rollout-plan', (req, res) => {
  const readiness = assessReadiness({ force: true });
  res.json({ ok: true, auto_execute: false, ...planRollout(readiness) });
});

router.post('/activate/:channel', (req, res) => {
  const channel = req.params.channel;
  const tenantId = req.body?.tenant_id || req.query.tenant_id || null;
  const validation = validateActivationRequest(channel, {
    tenant_id: tenantId,
    approved_by: req.user?.id,
    min_readiness_score: Number(req.body?.min_readiness_score) || 75
  });
  if (!validation.valid && req.body?.force !== true) {
    return res.status(403).json({ ok: false, promoted: false, ...validation });
  }
  const result = promoteChannel(channel, {
    tenant_id: tenantId,
    approved_by: req.user?.id,
    domain: req.body?.domain,
    user: req.user
  });
  const status = result.promoted ? 200 : 403;
  res.status(status).json({ ok: result.promoted === true, auto_executed: false, ...result });
});

router.post('/demote/:channel', (req, res) => {
  const result = executeRuntimeDemote(req.params.channel, {
    tenant_id: req.body?.tenant_id || req.query.tenant_id
  });
  res.json({ ok: true, auto_executed: false, ...result });
});

router.post('/activation/rollback-rollout', (req, res) => {
  const result = rollbackRollout(req.body?.scope || 'phase_f_only', {
    tenant_id: req.body?.tenant_id
  });
  res.json({ ok: true, auto_executed: false, ...result });
});

module.exports = router;
