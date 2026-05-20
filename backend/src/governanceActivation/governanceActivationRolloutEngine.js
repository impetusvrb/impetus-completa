'use strict';

const phaseI = require('./config/phaseIFeatureFlags');
const { logPhaseI } = require('./phaseILogger');
const { promoteChannel, demoteChannel, getRuntimeState } = require('./governanceActivationRuntime');
const { validateActivationRequest } = require('./governanceActivationValidator');
const { buildActivationPlan } = require('../governanceReadiness/governanceActivationPlanner');

const ROLLOUT_ORDER = ['kpi', 'summary', 'chat', 'boundary'];

/**
 * Rollout gradual por passos — cada passo requer gate; nunca activa todos automaticamente.
 */
function executeRolloutStep(stepChannel, ctx = {}) {
  if (!phaseI.isControlledGovernanceActivationEnabled()) {
    return { executed: false, reason: 'controlled_activation_off' };
  }
  return promoteChannel(stepChannel, ctx);
}

function planRollout(readiness = {}) {
  const plan = buildActivationPlan({ ...readiness, force: true });
  return {
    auto_execute: false,
    steps: ROLLOUT_ORDER.map((ch) => ({
      channel: ch,
      status: 'pending_manual_promotion',
      endpoint_hint: `POST /api/internal/governance/activate/${ch}`
    })),
    activation_plan: plan
  };
}

function rollbackRollout(scope = 'phase_f_channels', ctx = {}) {
  const channels = scope === 'all' ? ROLLOUT_ORDER : ROLLOUT_ORDER;
  const results = channels.map((ch) => demoteChannel(ch, ctx));
  logPhaseI('GOVERNANCE_ROLLBACK_READY', { scope, channels });
  return { rolled_back: true, auto_applied: false, results, env_mutation: false };
}

module.exports = { executeRolloutStep, planRollout, rollbackRollout, ROLLOUT_ORDER };
