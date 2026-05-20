'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { logPhaseT } = require('./phaseTLogger');
const {
  coordinateKpiRolloutReadiness,
  setRolloutMemoryState,
  getRolloutMemoryState,
  resetRolloutMemory,
  READINESS_THRESHOLD
} = require('./kpiRuntimeActivationCoordinator');
const { setTenantKpiRolloutActive } = require('./tenantKpiIsolation');
const { superviseKpiGovernance } = require('./kpiGovernanceSupervisor');
const { getKpiGovernanceTelemetry } = require('./kpiGovernanceTelemetry');

const ENV_KPI_CHANNEL = 'IMPETUS_KPI_GOVERNANCE';
const ENV_KPI_ROLLOUT = 'IMPETUS_KPI_GOVERNANCE_ROLLOUT';

function getKpiRolloutStatus(ctx = {}) {
  return {
    phase: 'T',
    observability: phaseT.isKpiGovernanceObservabilityEnabled(),
    rollout_flag: phaseT.isKpiGovernanceRolloutEnabled(),
    channel_flag: phaseT.isKpiGovernanceChannelEnabled(),
    global_auto_activation: false,
    memory: getRolloutMemoryState(),
    supervision: superviseKpiGovernance(ctx),
    telemetry: getKpiGovernanceTelemetry(),
    flags: {
      IMPETUS_KPI_GOVERNANCE_ROLLOUT: phaseT.isKpiGovernanceRolloutEnabled(),
      IMPETUS_KPI_TARGETING_VALIDATION: phaseT.isKpiTargetingValidationEnabled(),
      IMPETUS_KPI_PRECISION_RUNTIME: phaseT.isKpiPrecisionRuntimeEnabled(),
      IMPETUS_KPI_DELIVERY_STABILIZATION: phaseT.isKpiDeliveryStabilizationEnabled(),
      IMPETUS_KPI_GOVERNANCE_OBSERVABILITY: phaseT.isKpiGovernanceObservabilityEnabled(),
      IMPETUS_KPI_GOVERNANCE: phaseT.isKpiGovernanceChannelEnabled()
    }
  };
}

function assessKpiRolloutReadiness(user, kpiPayload, ctx = {}) {
  const readiness = coordinateKpiRolloutReadiness(user, kpiPayload, ctx);
  let phaseS = { ok: true };
  try {
    const ca = require('../controlledActivation/controlledActivationFacade');
    const er = ca.assessEnterpriseReadiness(user, ctx);
    phaseS = { ok: er.e_to_r_ready, controlled_activation: er.readiness };
  } catch {
    phaseS = { ok: false, note: 'controlled_activation_unavailable' };
  }
  return {
    e_to_s_ready: phaseS.ok,
    kpi_readiness: readiness,
    readiness_ok: readiness.readiness_ok && phaseS.ok,
    readiness_score: readiness.readiness_score,
    threshold: ctx.readiness_threshold ?? READINESS_THRESHOLD,
    auto_activate: false,
    shadow_first: !phaseT.isKpiGovernanceRolloutEnabled()
  };
}

function activateKpiGovernance(user, kpiPayload, ctx = {}) {
  const assessment = assessKpiRolloutReadiness(user, kpiPayload, ctx);
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

  if (!ctx.execute || !ctx.approved_by) {
    return {
      activated: false,
      prepared: true,
      env_flags: [ENV_KPI_ROLLOUT, ENV_KPI_CHANNEL],
      instruction: `Definir ${ENV_KPI_ROLLOUT}=on e ${ENV_KPI_CHANNEL}=on; pm2 reload impetus-backend --update-env`,
      requires_manual_pm2: true,
      readiness: assessment,
      global_activation: false,
      auto_executed: false
    };
  }

  const tenantId = ctx.tenant_id || user?.company_id;
  setRolloutMemoryState(true, { approved_by: ctx.approved_by, tenant_id: tenantId });
  if (tenantId) setTenantKpiRolloutActive(tenantId, true, { approved_by: ctx.approved_by });

  if (phaseT.isKpiGovernanceObservabilityEnabled()) {
    logPhaseT('KPI_GOVERNANCE_ACTIVATED', { tenant_id: tenantId, approved_by: ctx.approved_by, shadow_only: !phaseT.isKpiGovernanceRolloutEnabled() });
  }

  let channelCoord = null;
  try {
    const ca = require('../controlledActivation/controlledActivationFacade');
    channelCoord = ca.activateChannelForTenant(tenantId, 'kpi', {
      execute: true,
      approved_by: ctx.approved_by,
      readiness_ok: assessment.readiness_ok,
      stability_ok: assessment.kpi_readiness?.stability_ok
    });
  } catch {
    channelCoord = { note: 'controlled_activation_skipped' };
  }

  return {
    activated: true,
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    env_flags: [ENV_KPI_ROLLOUT, ENV_KPI_CHANNEL],
    enforcement_via_flag: phaseT.isKpiGovernanceRolloutEnabled(),
    shadow_observability: phaseT.isKpiGovernanceObservabilityEnabled(),
    channel_coordination: channelCoord,
    global_activation: false,
    auto_executed: false,
    readiness: assessment
  };
}

function deactivateKpiGovernance(ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      deactivated: false,
      prepared: true,
      instruction: `Definir ${ENV_KPI_CHANNEL}=off ${ENV_KPI_ROLLOUT}=off; pm2 reload`,
      auto_executed: false
    };
  }
  resetRolloutMemory();
  if (ctx.tenant_id) setTenantKpiRolloutActive(ctx.tenant_id, false, { approved_by: ctx.approved_by });
  return { deactivated: true, approved_by: ctx.approved_by, manual_pm2_required: true };
}

module.exports = {
  getKpiRolloutStatus,
  assessKpiRolloutReadiness,
  activateKpiGovernance,
  deactivateKpiGovernance,
  READINESS_THRESHOLD,
  ENV_KPI_CHANNEL,
  ENV_KPI_ROLLOUT
};
