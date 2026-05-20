'use strict';

const { logPhaseI } = require('./phaseILogger');
const { demoteChannel, getRuntimeState } = require('./governanceActivationRuntime');
const { coordinateRollback } = require('../governanceReadiness/governanceRollbackCoordinator');
const { listChannels } = require('./governanceControlledActivation');

/**
 * Plano de rollback imediato — não executa automaticamente em produção.
 */
function assessRollbackReadiness(ctx = {}) {
  const runtime = getRuntimeState();
  const activeChannels = listChannels().filter((c) => runtime.global_channels[c]);
  const coordinator = coordinateRollback({ scope: ctx.scope || 'phase_f_only' });

  logPhaseI('GOVERNANCE_ROLLBACK_READY', {
    active_runtime_channels: activeChannels,
    tenant_id: ctx.tenant_id
  });

  return {
    rollback_ready: true,
    auto_rollback: false,
    active_runtime_channels: activeChannels,
    runtime_demote_available: true,
    coordinator_plan: coordinator,
    immediate_actions: activeChannels.map((ch) => ({
      action: 'demoteChannel',
      channel: ch,
      tenant_id: ctx.tenant_id || null
    })),
    pm2_hint: coordinator.pm2_hint
  };
}

function executeRuntimeDemote(channel, ctx = {}) {
  return demoteChannel(channel, ctx);
}

module.exports = { assessRollbackReadiness, executeRuntimeDemote };
