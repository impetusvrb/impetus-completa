'use strict';

const finalFlags = require('../finalReview/config/finalReviewFeatureFlags');
const { logFinalReview } = require('../finalReview/finalReviewLogger');
const { validateShadowRuntime } = require('./shadowRuntimeValidator');
const { validatePerformance } = require('./governancePerformanceValidator');
const { detectAnomalies } = require('./governanceRuntimeAnomalyDetector');
const { validateRolloutSafety } = require('./rolloutSafetyValidator');

function runRuntimeValidation(ctx = {}) {
  if (!finalFlags.isRuntimeValidationEnabled() && !ctx.force) {
    return {
      enabled: false,
      message: 'IMPETUS_RUNTIME_VALIDATION=off',
      auto_activation: false
    };
  }

  logFinalReview('RUNTIME_VALIDATION_STARTED', {});

  const shadow = validateShadowRuntime(ctx);
  const performance = validatePerformance({ ...ctx, simulate: ctx.simulate !== false });
  const anomalies = detectAnomalies(ctx);
  const rollout = finalFlags.isRolloutSafetyValidationEnabled() || ctx.force ?
    validateRolloutSafety(ctx) :
    { skipped: true, reason: 'rollout_safety_flag_off' };

  let activation_runtime = null;
  try {
    const { getRuntimeState } = require('../governanceActivation/governanceActivationRuntime');
    activation_runtime = getRuntimeState();
  } catch {
    activation_runtime = null;
  }

  const passed =
    shadow.passed &&
    performance.passed &&
    anomalies.stable &&
    (rollout.skipped || rollout.rollout_readiness !== 'hold_until_readiness' || ctx.allow_hold);

  const result = {
    enabled: true,
    completed_at: new Date().toISOString(),
    passed,
    shadow_validation: shadow,
    performance_validation: performance,
    anomaly_detection: anomalies,
    rollout_safety: rollout,
    activation_runtime,
    leakage_residual: anomalies.anomalies.some((a) => a.type === 'leakage_residual') ? 'elevated' : 'low',
    false_positive_pressure: ctx.signals?.false_positive_rate ?? shadow.shadow_detail?.governance_false_positive_rate,
    auto_activation: false
  };

  logFinalReview('RUNTIME_VALIDATION_COMPLETED', { passed, anomaly_count: anomalies.anomaly_count });

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'runtime_validation', passed, ...result });
  } catch {
    /* optional */
  }

  return result;
}

module.exports = { runRuntimeValidation };
