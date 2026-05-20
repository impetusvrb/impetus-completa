'use strict';

/**
 * Etapa Final C — Controlled Production Rollout API (internal).
 */

const express = require('express');
const router = express.Router();

const flags = require('../../productionRollout/config/productionRolloutFeatureFlags');
const {
  getProductionStatus,
  promoteChannelInSequence,
  demoteChannelInRollout,
  validateProductionRollout,
  planPm2Reload,
  recommendTuning,
  superviseRuntime
} = require('../../productionRollout/productionRolloutCoordinator');
const { getDeploymentRunbook } = require('../../productionRollout/governanceDeploymentRunbook');
const { validatePreDeploy } = require('../../productionRollout/governanceDeploymentController');
const { verifyRollbackReadiness } = require('../../productionRollout/governanceRollbackVerification');
const { getOperationalObservation } = require('../../productionRollout/governanceOperationalObservation');
const { getSequenceState } = require('../../productionRollout/activationSequenceController');

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

router.get('/production/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const status = getProductionStatus({
    force: req.query.force === '1',
    tenant_id: req.query.tenant_id
  });
  res.json({ ok: true, ...status });
});

router.get('/production/sequence', (req, res) => {
  res.json({ ok: true, ...getSequenceState(), auto_execute: false });
});

router.get('/production/validate', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const validation = validateProductionRollout({
    force: req.query.force === '1' || flags.isProductionRolloutEnabled()
  });
  res.json({ ok: validation.valid === true, ...validation });
});

router.get('/production/deploy-check', (req, res) => {
  res.json({ ok: true, ...validatePreDeploy({ force: req.query.force === '1', skip_build_check: req.query.skip_build === '1' }) });
});

router.get('/production/observe', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const obs = getOperationalObservation({
    force: req.query.force === '1' || flags.isRuntimeObservationEnabled(),
    tenant_id: req.query.tenant_id
  });
  res.json({ ok: true, ...obs });
});

router.get('/production/rollback-verify', (req, res) => {
  res.json({
    ok: true,
    ...verifyRollbackReadiness({ tenant_id: req.query.tenant_id, scope: req.query.scope })
  });
});

router.get('/production/runbook', (req, res) => {
  res.json({ ok: true, ...getDeploymentRunbook() });
});

router.get('/production/reload-plan', (req, res) => {
  res.json({ ok: true, ...planPm2Reload({ approved_by: req.user?.id }) });
});

router.get('/production/tuning', (req, res) => {
  res.json({ ok: true, ...recommendTuning({ force: req.query.force === '1', tenant_id: req.query.tenant_id }) });
});

router.post('/production/promote/:channel', (req, res) => {
  const result = promoteChannelInSequence(req.params.channel, {
    tenant_id: req.body?.tenant_id || req.query.tenant_id,
    approved_by: req.user?.id,
    execute: req.body?.execute === true,
    user: req.user,
    readiness_opts: req.body?.readiness_opts,
    force: req.body?.force === true,
    metrics: req.body?.metrics
  });
  const status = result.promoted ? 200 : result.prepared ? 202 : 403;
  res.status(status).json({ ok: result.promoted === true || result.prepared === true, ...result });
});

router.post('/production/demote/:channel', (req, res) => {
  const result = demoteChannelInRollout(req.params.channel, {
    tenant_id: req.body?.tenant_id,
    approved_by: req.user?.id
  });
  res.json({ ok: true, ...result });
});

router.post('/production/supervise', (req, res) => {
  res.json({
    ok: true,
    ...superviseRuntime({ tenant_id: req.body?.tenant_id, force: req.body?.force === true })
  });
});

module.exports = router;
