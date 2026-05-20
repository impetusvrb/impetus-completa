'use strict';

const flags = require('./config/productionRolloutFeatureFlags');
const { validateRolloutSafety } = require('../runtimeValidation/rolloutSafetyValidator');
const { runRuntimeValidation } = require('../runtimeValidation/governanceRuntimeValidation');
const { verifyRollbackReadiness } = require('./governanceRollbackVerification');
const { validatePreDeploy } = require('./governanceDeploymentController');

function validateProductionRollout(ctx = {}) {
  if (!flags.isProductionRolloutEnabled() && !ctx.force) {
    return { valid: false, reason: 'production_rollout_off' };
  }

  const deploy = validatePreDeploy(ctx);
  const rollout = validateRolloutSafety({ force: ctx.force });
  const runtime = runRuntimeValidation({ force: ctx.force, simulate: true, allow_hold: true });
  const rollback = verifyRollbackReadiness(ctx);

  const valid =
    deploy.deployment_ready !== false &&
    rollout.rollout_readiness !== 'hold_until_readiness' &&
    runtime.passed !== false &&
    rollback.verified;

  return {
    valid,
    deploy,
    rollout,
    runtime,
    rollback,
    auto_activation: false,
    validated_at: new Date().toISOString()
  };
}

module.exports = { validateProductionRollout };
