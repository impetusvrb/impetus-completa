'use strict';

/**
 * Coordenador central — rollout de produção supervisionado (Etapa Final C).
 */

const flags = require('./config/productionRolloutFeatureFlags');
const { logProductionRollout } = require('./productionRolloutLogger');
function _seq() {
  return require('./activationSequenceController');
}
const { superviseRuntime } = require('./rolloutRuntimeSupervisor');
const { validatePreDeploy, assessDeploymentReadiness } = require('./governanceDeploymentController');
const { validateProductionRollout } = require('./productionRolloutValidation');
const { getOperationalObservation } = require('./governanceOperationalObservation');
const { verifyRollbackReadiness } = require('./governanceRollbackVerification');
const { getDeploymentRunbook } = require('./governanceDeploymentRunbook');
const { planPm2Reload } = require('./governanceReloadCoordinator');
const { recommendTuning } = require('./governanceRuntimeTuning');
const { executeTenantPromotion, planTenantRollout } = require('./tenantRolloutCoordinator');

const DEFAULT_METRICS = {
  shadow_alignment_rate: 0.96,
  governance_confidence_score: 0.88,
  governance_false_positive_rate: 0.02,
  governance_overblocking_rate: 0.04,
  governance_context_preservation_rate: 0.92,
  drift_stability: 'stable'
};

function getProductionStatus(ctx = {}) {
  if (!flags.isProductionRolloutEnabled() && !ctx.force) {
    return {
      enabled: false,
      message: 'IMPETUS_PRODUCTION_ROLLOUT=off',
      auto_activation: false
    };
  }

  return {
    enabled: true,
    flags: {
      production_rollout: flags.isProductionRolloutEnabled(),
      stabilization: flags.isGovernanceStabilizationEnabled(),
      runtime_observation: flags.isRuntimeObservationEnabled()
    },
    sequence: _seq().getSequenceState(),
    deployment: assessDeploymentReadiness(ctx),
    observation: getOperationalObservation({ force: ctx.force }),
    rollback: verifyRollbackReadiness(ctx),
    runbook: getDeploymentRunbook(),
    auto_activation: false,
    global_governance_active: false
  };
}

/**
 * Promove canal na sequência — manual, gated, reversível.
 */
function promoteChannelInSequence(channel, ctx = {}) {
  if (!flags.isProductionRolloutEnabled() && !ctx.force) {
    return { promoted: false, reason: 'production_rollout_off', auto_executed: false };
  }

  const seq = _seq().canPromoteChannel(channel, ctx);
  if (!seq.allowed) {
    return { promoted: false, reason: seq.reason, expected_next: seq.expected_next, auto_executed: false };
  }

  const validation = validateProductionRollout({ ...ctx, force: ctx.force || true });
  if (!validation.valid && ctx.force_validation !== false) {
    return { promoted: false, reason: 'production_validation_failed', validation, auto_executed: false };
  }

  if (!ctx.execute || !ctx.approved_by) {
    return {
      promoted: false,
      prepared: true,
      channel,
      sequence: seq,
      validation,
      endpoint: `POST /api/internal/governance/production/promote/${channel}`,
      auto_executed: false
    };
  }

  if (ctx.tenant_id) {
    return executeTenantPromotion(ctx.tenant_id, channel, ctx);
  }

  const { promoteChannel } = require('../governanceActivation/governanceActivationRuntime');
  const result = promoteChannel(channel, {
    approved_by: ctx.approved_by,
    user: ctx.user,
    tenant_id: null,
    readiness_opts: { metrics: ctx.metrics || DEFAULT_METRICS, ...ctx.readiness_opts }
  });

  if (result.promoted) {
    _seq().recordChannelPromoted(channel);
    logProductionRollout('PRODUCTION_ACTIVATION_VALIDATED', { channel, tenant_id: null });
    superviseRuntime(ctx);
    try {
      const audit = require('../audit/cognitiveGovernanceAuditFeed');
      audit.appendOperational({ type: 'production_channel_promoted', channel, promotion_id: result.promotion?.id });
    } catch {
      /* optional */
    }
  }

  return { ...result, auto_executed: false, sequence: _seq().getSequenceState() };
}

function demoteChannelInRollout(channel, ctx = {}) {
  const { demoteChannel } = require('../governanceActivation/governanceActivationRuntime');
  const result = demoteChannel(channel, { tenant_id: ctx.tenant_id, approved_by: ctx.approved_by });
  return { ...result, auto_executed: false, rollback_supervised: true };
}

module.exports = {
  getProductionStatus,
  promoteChannelInSequence,
  demoteChannelInRollout,
  validateProductionRollout,
  planTenantRollout,
  planPm2Reload,
  recommendTuning,
  superviseRuntime,
  DEFAULT_METRICS
};
