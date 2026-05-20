'use strict';

const { validateTenantActivation } = require('./tenantActivationSafety');
const { canPromoteChannel } = require('./activationSequenceController');
const { logProductionRollout } = require('./productionRolloutLogger');

/**
 * Coordena rollout por tenant — um tenant de cada vez; sem promoção em massa.
 */
function planTenantRollout(tenantId, ctx = {}) {
  const safety = validateTenantActivation(tenantId, ctx.channel, ctx);
  const sequence = canPromoteChannel(ctx.channel || 'kpi', ctx);

  const plan = {
    tenant_id: tenantId,
    channel: ctx.channel,
    tenant_safe: safety.safe,
    sequence_allowed: sequence.allowed,
    manual_promotion_required: true,
    auto_executed: false,
    endpoint: ctx.channel ? `POST /api/internal/governance/activate/${ctx.channel}` : null,
    observation_days: 7
  };

  logProductionRollout('TENANT_ROLLOUT_PLANNED', { tenant_id: tenantId, channel: ctx.channel });

  return plan;
}

function executeTenantPromotion(tenantId, channel, ctx = {}) {
  const safety = validateTenantActivation(tenantId, channel, ctx);
  if (!safety.safe) {
    return { promoted: false, reason: safety.reason, auto_executed: false };
  }

  const seq = canPromoteChannel(channel, { ...ctx, approved_by: ctx.approved_by });
  if (!seq.allowed) {
    return { promoted: false, reason: seq.reason, expected_next: seq.expected_next, auto_executed: false };
  }

  if (!ctx.execute || !ctx.approved_by) {
    return {
      promoted: false,
      prepared: true,
      plan: planTenantRollout(tenantId, { channel }),
      reason: 'manual_execute_required',
      auto_executed: false
    };
  }

  const { promoteChannel } = require('../governanceActivation/governanceActivationRuntime');
  const { recordChannelPromoted } = require('./activationSequenceController');

  const result = promoteChannel(channel, {
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    user: ctx.user,
    readiness_opts: ctx.readiness_opts
  });

  if (result.promoted) {
    recordChannelPromoted(channel);
    try {
      require('./tenantGovernanceStabilizer').observeTenantStability(tenantId, { observed: true });
    } catch {
      /* optional */
    }
    logProductionRollout('PRODUCTION_ACTIVATION_VALIDATED', { tenant_id: tenantId, channel });
  }

  return { ...result, auto_executed: false, tenant_id: tenantId };
}

module.exports = { planTenantRollout, executeTenantPromotion };
