'use strict';

const { computeStabilizationMetrics } = require('./governanceStabilizationMonitor');

function assessActivationHealth(ctx = {}) {
  let health = { monitoring: false };
  try {
    const { getHealthIfMonitoring } = require('../governanceActivation/governanceRuntimeHealth');
    health = getHealthIfMonitoring();
  } catch {
    health = {};
  }

  const stabilization = computeStabilizationMetrics(ctx);

  let channels = [];
  try {
    const { ROLLOUT_SEQUENCE } = require('./activationSequenceController');
    const { resolveChannelActivation } = require('../governanceActivation/governanceActivationRuntime');
    channels = ROLLOUT_SEQUENCE.map((ch) => ({
      channel: ch,
      ...resolveChannelActivation(ch, ctx)
    }));
  } catch {
    channels = [];
  }

  const activation_healthy =
    (health.governance_runtime_health === 'healthy' || !health.monitoring) &&
    stabilization.stable !== false;

  return {
    activation_healthy,
    phase_i_health: health,
    stabilization,
    channels,
    auto_remediation: false
  };
}

module.exports = { assessActivationHealth };
