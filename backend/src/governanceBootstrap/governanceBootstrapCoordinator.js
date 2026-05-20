'use strict';

const bootstrapFlags = require('./config/bootstrapFeatureFlags');
const { logBootstrap } = require('./bootstrapLogger');
const { runPreDeployAudit } = require('./preDeployGovernanceAudit');
const { getAggregateSummary } = require('./governanceShadowRuntimeCollector');
const { mapEntrypoints } = require('./governanceEntrypointMapper');
const { evaluateSoftKpiActivation } = require('./softKpiActivationEvaluator');

/** Flags seguras para shadow-first bootstrap (observability ON, enforcement OFF). */
const BOOTSTRAP_SAFE_FLAGS_ON = {
  IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION: 'on',
  IMPETUS_GOVERNANCE_OPERATIONS: 'on',
  IMPETUS_RUNTIME_GOVERNANCE_MONITORING: 'on',
  IMPETUS_RUNTIME_OBSERVATION: 'on',
  IMPETUS_PRODUCTION_ROLLOUT: 'on',
  IMPETUS_GOVERNANCE_STABILIZATION: 'on',
  IMPETUS_FINAL_GOVERNANCE_REVIEW: 'on',
  IMPETUS_RUNTIME_VALIDATION: 'on',
  IMPETUS_ROLLOUT_SAFETY_VALIDATION: 'on',
  IMPETUS_GOVERNANCE_SHADOW_MODE: 'on',
  IMPETUS_FAILSAFE_GOVERNANCE: 'on',
  IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE: 'on',
  IMPETUS_GLOBAL_SHADOW_OBSERVATION: 'on',
  IMPETUS_GOVERNANCE_READINESS: 'on',
  IMPETUS_GOVERNANCE_QUALITY_GATES: 'on',
  IMPETUS_GOVERNANCE_AUDIT_FEED: 'on',
  IMPETUS_GOVERNANCE_EXPLAINABILITY: 'on',
  IMPETUS_GOVERNANCE_INCIDENT_ENGINE: 'on',
  IMPETUS_GOVERNANCE_RUNTIME_HEALTH: 'on'
};

const BOOTSTRAP_ENFORCEMENT_FLAGS_OFF = {
  IMPETUS_KPI_GOVERNANCE: 'off',
  IMPETUS_SUMMARY_GOVERNANCE: 'off',
  IMPETUS_CHAT_GOVERNANCE: 'off',
  IMPETUS_COGNITIVE_BOUNDARY_GUARD: 'off',
  IMPETUS_SOFT_KPI_GOVERNANCE_ROLLOUT: 'off'
};

function getBootstrapFlagPlan() {
  return {
    activate: BOOTSTRAP_SAFE_FLAGS_ON,
    keep_off: BOOTSTRAP_ENFORCEMENT_FLAGS_OFF,
    auto_apply: false,
    pm2_hint: 'pm2 reload impetus-backend --update-env',
    description: 'shadow_first_observability_bootstrap'
  };
}

function getBootstrapStatus(ctx = {}) {
  const active = bootstrapFlags.isGovernanceBootstrapActive() || ctx.force;

  let ops = null;
  let finalReport = null;
  let production = null;

  if (active) {
    try {
      ops = require('../governanceOperations/governanceOperationsService').getOperationsStatus({ force: true });
    } catch {
      ops = null;
    }
    try {
      finalReport = require('../finalReview/integratedGovernanceReview').runIntegratedReview({ force: true });
    } catch {
      finalReport = null;
    }
    try {
      production = require('../productionRollout/productionRolloutCoordinator').getProductionStatus({ force: true });
    } catch {
      production = null;
    }
  }

  const shadowAggregate = getAggregateSummary();
  const entrypoints = mapEntrypoints({ live: true });
  const softKpi = evaluateSoftKpiActivation({ force: active });
  const preDeploy = runPreDeployAudit();

  const stable =
    softKpi.shadow_summary?.passed !== false &&
    (production?.observation?.runtime?.stable !== false);

  if (stable && active) {
    logBootstrap('PRODUCTION_GOVERNANCE_STABLE', {});
  }

  return {
    bootstrap_active: active,
    mode: 'shadow_observability_first',
    hard_enforcement: false,
    global_governance_enforced: false,
    flag_plan: getBootstrapFlagPlan(),
    pre_deploy_audit: preDeploy,
    operations: ops,
    final_review: finalReport?.final_readiness || null,
    production_status: production,
    shadow_observation: shadowAggregate,
    entrypoint_map_summary: {
      total: entrypoints.total,
      gaps: entrypoints.coverage_gaps.length,
      shadow_only: entrypoints.shadow_only_count
    },
    soft_kpi: softKpi,
    auto_activation: false
  };
}

function startGlobalShadowObservation(ctx = {}) {
  process.env.IMPETUS_GLOBAL_SHADOW_OBSERVATION = 'on';
  logBootstrap('GLOBAL_SHADOW_OBSERVATION_STARTED', { tenant_id: ctx.tenant_id });
  return {
    started: true,
    log_dir: require('./governanceShadowRuntimeCollector').LOG_DIR,
    auto_remediation: false
  };
}

module.exports = {
  BOOTSTRAP_SAFE_FLAGS_ON,
  BOOTSTRAP_ENFORCEMENT_FLAGS_OFF,
  getBootstrapFlagPlan,
  getBootstrapStatus,
  startGlobalShadowObservation
};
