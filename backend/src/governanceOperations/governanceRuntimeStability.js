'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');

function evaluateRuntimeStability(ctx = {}) {
  let health = {};
  try {
    const { computeHealth } = require('../governanceActivation/governanceRuntimeHealth');
    health = computeHealth();
  } catch {
    health = {};
  }

  const stability_score = health.activation_stability_score ?? 0.9;
  const overblocking = health.runtime_overblocking_rate ?? 0;
  const context_loss = health.runtime_context_loss ?? 0;
  const degradation = health.activation_degradation_score ?? 0;

  let status = 'stable';
  if (stability_score < 0.65 || degradation > 0.35) status = 'unstable';
  else if (stability_score < 0.85 || overblocking > 0.15) status = 'watch';

  return {
    enabled: phaseJ.isGovernanceRuntimeHealthEnabled() || ctx.force,
    governance_runtime_stability: stability_score,
    status,
    overblocking_rate: overblocking,
    context_loss_rate: context_loss,
    degradation_score: degradation,
    governance_runtime_health: health.governance_runtime_health || 'unknown',
    auto_remediation: false
  };
}

module.exports = { evaluateRuntimeStability };
