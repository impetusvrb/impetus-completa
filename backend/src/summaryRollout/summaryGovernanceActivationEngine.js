'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { logPhaseV } = require('./phaseVLogger');
const {
  coordinateSummaryRolloutReadiness,
  setRolloutMemoryState,
  getRolloutMemoryState,
  resetRolloutMemory,
  READINESS_THRESHOLD
} = require('./summaryRuntimeCoordinator');
const { setTenantSummaryRolloutActive } = require('./tenantSummaryIsolation');
const { superviseSummaryGovernance } = require('./summaryGovernanceSupervisor');
const { getSummaryGovernanceTelemetry } = require('./summaryGovernanceTelemetry');

const ENV_SUMMARY_CHANNEL = 'IMPETUS_SUMMARY_GOVERNANCE';
const ENV_SUMMARY_ROLLOUT = 'IMPETUS_SUMMARY_GOVERNANCE_ROLLOUT';

function getSummaryRolloutStatus(ctx = {}) {
  return {
    phase: 'V',
    observability: phaseV.isSummaryGovernanceObservabilityEnabled(),
    rollout_flag: phaseV.isSummaryGovernanceRolloutEnabled(),
    channel_flag: phaseV.isSummaryGovernanceChannelEnabled(),
    global_auto_activation: false,
    memory: getRolloutMemoryState(),
    supervision: superviseSummaryGovernance(ctx),
    telemetry: getSummaryGovernanceTelemetry(),
    flags: {
      IMPETUS_SUMMARY_GOVERNANCE_ROLLOUT: phaseV.isSummaryGovernanceRolloutEnabled(),
      IMPETUS_SUMMARY_SEMANTIC_STABILIZATION: phaseV.isSummarySemanticStabilizationEnabled(),
      IMPETUS_SUMMARY_RELEVANCE_ENGINE: phaseV.isSummaryRelevanceEngineEnabled(),
      IMPETUS_SUMMARY_DELIVERY_PRECISION: phaseV.isSummaryDeliveryPrecisionEnabled(),
      IMPETUS_SUMMARY_GOVERNANCE_OBSERVABILITY: phaseV.isSummaryGovernanceObservabilityEnabled(),
      IMPETUS_SUMMARY_GOVERNANCE: phaseV.isSummaryGovernanceChannelEnabled()
    }
  };
}

function assessSummaryRolloutReadiness(user, summaryPayload, ctx = {}) {
  const readiness = coordinateSummaryRolloutReadiness(user, summaryPayload, ctx);

  let kpiReady = { ok: true };
  try {
    const kpi = require('../kpiRollout/kpiGovernanceActivationEngine');
    const kr = kpi.assessKpiRolloutReadiness(user, { kpis: [] }, ctx);
    kpiReady = { ok: kr.readiness_ok, score: kr.readiness_score };
  } catch {
    kpiReady = { ok: false, note: 'kpi_rollout_unavailable' };
  }

  let channelOrder = { ok: true };
  try {
    const gov = require('../controlledActivation/channelActivationGovernance');
    const activated = gov.getActivatedChannels();
    channelOrder = {
      ok: activated.includes('kpi') || ctx.skip_kpi_prerequisite,
      activated,
      next_expected: gov.getNextExpectedChannel()
    };
  } catch {
    channelOrder = { ok: true, note: 'channel_governance_unavailable' };
  }

  const readiness_ok =
    readiness.readiness_ok && kpiReady.ok && (channelOrder.ok || ctx.force_readiness);

  return {
    kpi_prerequisite: kpiReady,
    channel_order: channelOrder,
    summary_readiness: readiness,
    readiness_ok,
    readiness_score: readiness.readiness_score,
    threshold: ctx.readiness_threshold ?? READINESS_THRESHOLD,
    auto_activate: false,
    shadow_first: !phaseV.isSummaryGovernanceRolloutEnabled()
  };
}

function activateSummaryGovernance(user, summaryPayload, ctx = {}) {
  const assessment = assessSummaryRolloutReadiness(user, summaryPayload, ctx);
  const threshold = ctx.readiness_threshold ?? READINESS_THRESHOLD;

  if (assessment.readiness_score < threshold && !ctx.force_readiness) {
    return {
      activated: false,
      reason: 'readiness_below_threshold',
      readiness_score: assessment.readiness_score,
      threshold,
      auto_executed: false
    };
  }

  if (!channelOrderOk(assessment) && !ctx.force_readiness) {
    return {
      activated: false,
      reason: 'kpi_channel_prerequisite',
      channel_order: assessment.channel_order,
      auto_executed: false
    };
  }

  if (!ctx.execute || !ctx.approved_by) {
    return {
      activated: false,
      prepared: true,
      env_flags: [ENV_SUMMARY_ROLLOUT, ENV_SUMMARY_CHANNEL],
      instruction: `Definir ${ENV_SUMMARY_ROLLOUT}=on e ${ENV_SUMMARY_CHANNEL}=on; pm2 reload impetus-backend --update-env`,
      requires_manual_pm2: true,
      readiness: assessment,
      global_activation: false,
      auto_executed: false
    };
  }

  const tenantId = ctx.tenant_id || user?.company_id;
  setRolloutMemoryState(true, { approved_by: ctx.approved_by, tenant_id: tenantId });
  if (tenantId) setTenantSummaryRolloutActive(tenantId, true, { approved_by: ctx.approved_by });

  if (phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_GOVERNANCE_ACTIVATED', {
      tenant_id: tenantId,
      approved_by: ctx.approved_by,
      shadow_only: !phaseV.isSummaryGovernanceRolloutEnabled()
    });
  }

  let channelCoord = null;
  try {
    const ca = require('../controlledActivation/controlledActivationFacade');
    channelCoord = ca.activateChannelForTenant(tenantId, 'summary', {
      execute: true,
      approved_by: ctx.approved_by,
      readiness_ok: assessment.readiness_ok,
      stability_ok: assessment.summary_readiness?.stability_ok
    });
  } catch {
    channelCoord = { note: 'controlled_activation_skipped' };
  }

  return {
    activated: true,
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    env_flags: [ENV_SUMMARY_ROLLOUT, ENV_SUMMARY_CHANNEL],
    enforcement_via_flag: phaseV.isSummaryGovernanceRolloutEnabled(),
    channel_coordination: channelCoord,
    global_activation: false,
    auto_executed: false,
    readiness: assessment
  };
}

function channelOrderOk(assessment) {
  return assessment.channel_order?.ok !== false;
}

function deactivateSummaryGovernance(ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      deactivated: false,
      prepared: true,
      instruction: `Definir ${ENV_SUMMARY_CHANNEL}=off ${ENV_SUMMARY_ROLLOUT}=off; pm2 reload`,
      auto_executed: false
    };
  }
  resetRolloutMemory();
  if (ctx.tenant_id) setTenantSummaryRolloutActive(ctx.tenant_id, false, { approved_by: ctx.approved_by });
  return { deactivated: true, approved_by: ctx.approved_by, manual_pm2_required: true };
}

module.exports = {
  getSummaryRolloutStatus,
  assessSummaryRolloutReadiness,
  activateSummaryGovernance,
  deactivateSummaryGovernance,
  READINESS_THRESHOLD,
  ENV_SUMMARY_CHANNEL,
  ENV_SUMMARY_ROLLOUT
};
