'use strict';

const flags = require('./config/productionRolloutFeatureFlags');
const { logProductionRollout } = require('./productionRolloutLogger');

function _envOn(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || v === '1';
}

function assessDeploymentReadiness(ctx = {}) {
  if (!flags.isProductionRolloutEnabled() && !ctx.force) {
    return { ready: false, reason: 'production_rollout_off' };
  }

  const checks = {
    controlled_activation: _envOn('IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION'),
    shadow_mode: _envOn('IMPETUS_GOVERNANCE_SHADOW_MODE', true),
    failsafe: _envOn('IMPETUS_FAILSAFE_GOVERNANCE', true),
    quality_gates: _envOn('IMPETUS_GOVERNANCE_QUALITY_GATES'),
    global_channel_flags_off: !['IMPETUS_KPI_GOVERNANCE', 'IMPETUS_SUMMARY_GOVERNANCE', 'IMPETUS_CHAT_GOVERNANCE', 'IMPETUS_COGNITIVE_BOUNDARY_GUARD']
      .some((f) => _envOn(f))
  };

  let finalReview = null;
  try {
    const { finalizeReadiness } = require('../finalReview/governanceReadinessFinalizer');
    finalReview = finalizeReadiness({ force: true });
  } catch {
    finalReview = null;
  }

  const ready =
    checks.shadow_mode &&
    checks.failsafe &&
    checks.global_channel_flags_off &&
    (finalReview?.governance_health ?? 0) >= 70;

  return {
    ready,
    checks,
    final_readiness: finalReview,
    build_integrity: ctx.skip_build_check ? 'skipped' : 'manual_verify_required',
    pm2_hint: 'pm2 reload impetus-backend --update-env',
    auto_deploy: false
  };
}

function validatePreDeploy(ctx = {}) {
  const deployment = assessDeploymentReadiness(ctx);
  let validator = null;
  try {
    validator = require('./governanceDeploymentValidator').validateDeployment(ctx);
  } catch {
    validator = { passed: false };
  }

  return {
    deployment_ready: deployment.ready && validator.passed !== false,
    deployment,
    validator,
    auto_executed: false
  };
}

module.exports = { assessDeploymentReadiness, validatePreDeploy };
