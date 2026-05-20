'use strict';

function assessStability(ctx = {}) {
  let stability = { status: 'unknown' };
  try {
    stability = require('../governanceOperations/governanceRuntimeStability').evaluateRuntimeStability({
      force: ctx.force
    });
  } catch {
    /* fallback */
  }

  let drift = { drift_stability: 'stable' };
  try {
    const readiness = require('../governanceReadiness/governanceReadinessEngine').assessReadiness({ force: true });
    drift = { drift_stability: readiness.drift_stability, shadow_quality: readiness.shadow_quality };
  } catch {
    /* optional */
  }

  const runtime_stability =
    stability.status === 'stable' && drift.drift_stability === 'stable' ? 'stable' :
    stability.status === 'unstable' || drift.drift_stability === 'unstable' ? 'unstable' : 'watch';

  return {
    runtime_stability,
    stability_detail: stability,
    drift,
    tenant_isolation_confidence: _tenantIsolationConfidence(ctx),
    auto_activation: false
  };
}

function _tenantIsolationConfidence(ctx) {
  try {
    const iso = require('../governanceActivation/tenantActivationIsolation');
    const phaseI = require('../governanceActivation/config/phaseIFeatureFlags');
    if (!phaseI.isTenantSafeGovernanceEnabled() && !ctx.force) return 'framework_ready';
    return typeof iso.tenantAllowsChannel === 'function' ? 'high' : 'low';
  } catch {
    return 'unknown';
  }
}

module.exports = { assessStability };
