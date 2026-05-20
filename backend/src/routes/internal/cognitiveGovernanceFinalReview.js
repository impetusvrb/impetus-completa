'use strict';

/**
 * Etapa Final A/B — Integrated Governance Review + Runtime Validation
 * GET /api/internal/governance/final/review
 * GET /api/internal/governance/final/runtime-validation
 * GET /api/internal/governance/final/health
 * GET /api/internal/governance/final/coverage
 * GET /api/internal/governance/final/rollout-safety
 * GET /api/internal/governance/final/report
 */

const express = require('express');
const router = express.Router();

const finalFlags = require('../../finalReview/config/finalReviewFeatureFlags');
const { runIntegratedReview } = require('../../finalReview/integratedGovernanceReview');
const { runRuntimeValidation } = require('../../runtimeValidation/governanceRuntimeValidation');
const { finalizeReadiness } = require('../../finalReview/governanceReadinessFinalizer');
const { auditCoverage } = require('../../finalReview/governanceCoverageAudit');
const { validateRolloutSafety } = require('../../runtimeValidation/rolloutSafetyValidator');

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

router.get('/final/review', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const review = runIntegratedReview({
    force: req.query.force === '1',
    tenant_id: req.query.tenant_id
  });
  res.json({ ok: true, ...review });
});

router.get('/final/runtime-validation', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const validation = runRuntimeValidation({
    force: req.query.force === '1',
    simulate: req.query.simulate !== '0',
    tenant_id: req.query.tenant_id
  });
  res.json({ ok: true, ...validation });
});

router.get('/final/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const health = finalizeReadiness({ force: req.query.force === '1' });
  res.json({ ok: true, ...health });
});

router.get('/final/coverage', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const coverage = auditCoverage({ tenant_id: req.query.tenant_id });
  res.json({ ok: true, ...coverage });
});

router.get('/final/rollout-safety', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const rollout = validateRolloutSafety({
    force: req.query.force === '1' || finalFlags.isRolloutSafetyValidationEnabled()
  });
  res.json({ ok: true, ...rollout });
});

router.get('/final/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const force = req.query.force === '1';
  const review = runIntegratedReview({ force });
  const runtime = runRuntimeValidation({ force, simulate: true, allow_hold: true });
  const rollout = validateRolloutSafety({ force: force || finalFlags.isRolloutSafetyValidationEnabled() });
  const health = finalizeReadiness({ force });

  res.json({
    ok: true,
    generated_at: new Date().toISOString(),
    flags: {
      final_review: finalFlags.isFinalGovernanceReviewEnabled(),
      runtime_validation: finalFlags.isRuntimeValidationEnabled(),
      rollout_safety: finalFlags.isRolloutSafetyValidationEnabled()
    },
    integrated_review: review,
    runtime_validation: runtime,
    rollout_safety: rollout,
    final_readiness: health,
    auto_activation: false,
    global_governance_active: false
  });
});

module.exports = router;
