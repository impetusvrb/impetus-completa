'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');
const { validateActivationRequest } = require('../governanceActivation/governanceActivationValidator');

/**
 * Orquestra activação — manual, gated; NUNCA auto-activa.
 */
function orchestrateActivation(channel, ctx = {}) {
  if (!phaseJ.isGovernanceOperationsEnabled() && !ctx.force) {
    return { orchestrated: false, reason: 'governance_operations_off', auto_executed: false };
  }

  const validation = validateActivationRequest(channel, ctx);
  if (!validation.valid) {
    logPhaseJ('GOVERNANCE_ACTIVATION_ORCHESTRATION_DENIED', {
      channel,
      reason: validation.reason
    });
    return {
      orchestrated: false,
      auto_executed: false,
      validation,
      next_step: 'resolve_readiness_blockers'
    };
  }

  const plan = {
    channel,
    tenant_id: ctx.tenant_id || null,
    quality_gate_passed: true,
    readiness_score: validation.readiness_score,
    execution: 'manual_required',
    endpoint: `POST /api/internal/governance/activate/${channel}`,
    auto_executed: false
  };

  logPhaseJ('GOVERNANCE_ROLLOUT_PREPARED', plan);

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'activation_orchestration', ...plan });
  } catch {
    /* optional */
  }

  if (ctx.execute === true && ctx.approved_by) {
    const { promoteChannel } = require('../governanceActivation/governanceActivationRuntime');
    const result = promoteChannel(channel, ctx);
    return { orchestrated: true, executed: result.promoted === true, auto_executed: false, plan, result };
  }

  return { orchestrated: true, prepared: true, auto_executed: false, plan };
}

module.exports = { orchestrateActivation };
