'use strict';

const { assessActivationSafety } = require('./activationSafetyAssessment');

const ROLLOUT_ORDER = ['kpi', 'summary', 'chat', 'boundary'];

function validateRolloutSafety(ctx = {}) {
  const activation = assessActivationSafety(ctx);

  let rollback = { rollback_ready: true, auto_rollback: false };
  try {
    const { assessRollbackReadiness } = require('../governanceActivation/governanceRollbackReadiness');
    rollback = assessRollbackReadiness({ scope: ctx.scope || 'phase_f_only' });
  } catch {
    /* optional */
  }

  let emergency = { prepared: false };
  try {
    const phaseJ = require('../governanceOperations/config/phaseJFeatureFlags');
    if (phaseJ.isGovernanceEmergencyControlsEnabled() || ctx.force) {
      emergency = { controls_available: true, auto_executed: false };
    }
  } catch {
    emergency = { controls_available: false };
  }

  const readiness = activation.activation_ready ? 'supervised_rollout_approved' : 'hold_until_readiness';

  return {
    rollout_readiness: readiness,
    rollout_order: ROLLOUT_ORDER.map((ch, i) => ({
      step: i + 1,
      channel: ch,
      classification: activation.safe_channels.includes(ch) ? 'safe' : 'sensitive',
      manual_promotion_required: true,
      endpoint: `POST /api/internal/governance/activate/${ch}`
    })),
    safe_channels: activation.safe_channels,
    sensitive_channels: activation.sensitive_channels,
    rollback_readiness: rollback,
    emergency_readiness: emergency,
    supervised_plan: {
      auto_execute: false,
      shadow_observation_days_between_steps: 7,
      quality_gates_required: true
    },
    auto_activation: false
  };
}

module.exports = { validateRolloutSafety, ROLLOUT_ORDER };
