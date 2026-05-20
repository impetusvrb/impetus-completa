'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');

function orchestratePromotion(channel, ctx = {}) {
  if (!phaseJ.isGovernanceOperationsEnabled() && !ctx.force) {
    return { orchestrated: false, reason: 'governance_operations_off', auto_executed: false };
  }

  let gate = null;
  try {
    const { assessReadiness } = require('../governanceReadiness/governanceReadinessEngine');
    const { evaluatePromotionGate } = require('../governanceQuality/governancePromotionGate');
    const readiness = assessReadiness({
      force: true,
      metrics: ctx.metrics || ctx.readiness_opts?.metrics
    });
    gate = evaluatePromotionGate(readiness, { force: ctx.force });
  } catch {
    gate = { allowed: false, reason: 'gate_unavailable' };
  }

  if (!gate.allowed && ctx.force !== true) {
    return {
      orchestrated: false,
      auto_executed: false,
      quality_gate: gate,
      promotion_blocked: true
    };
  }

  const orchestration = {
    channel,
    tenant_id: ctx.tenant_id || null,
    quality_gate: gate,
    promotion_id: `orch_${Date.now()}`,
    manual_confirmation_required: true,
    auto_executed: false
  };

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'promotion_orchestration', ...orchestration });
  } catch {
    /* optional */
  }

  if (ctx.execute === true && ctx.approved_by) {
    const { promoteChannel } = require('../governanceActivation/governanceActivationRuntime');
    const result = promoteChannel(channel, ctx);
    return { orchestrated: true, executed: result.promoted === true, auto_executed: false, orchestration, result };
  }

  return { orchestrated: true, prepared: true, auto_executed: false, orchestration };
}

module.exports = { orchestratePromotion };
