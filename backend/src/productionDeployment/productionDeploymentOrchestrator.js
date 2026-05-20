'use strict';

const flags = require('./config/productionDeploymentFeatureFlags');
const { logProductionDeployment } = require('./productionDeploymentLogger');
const { recordDeployDryRun, recordDeployExecution } = require('./productionDeploymentTelemetry');
const { validateRuntimeDeployment } = require('./runtimeDeploymentValidator');
const { superviseDeploymentRollback } = require('./deploymentRollbackSupervisor');
const { consolidateDeploymentHealth } = require('./deploymentHealthConsolidator');
const { coordinateSafeReload } = require('./safeReloadCoordinator');

function validateDeploymentFlags() {
  const observability = flags.isDeploymentObservabilityEnabled();
  const deployment = flags.isProductionDeploymentEnabled();
  const validation = flags.isDeploymentValidationEnabled();
  const reload = flags.isSafeReloadCoordinationEnabled();

  const warnings = [];
  if (!deployment) warnings.push('IMPETUS_PRODUCTION_DEPLOYMENT=off — execute bloqueado');
  if (!validation) warnings.push('IMPETUS_DEPLOYMENT_VALIDATION=off — validação em modo observável');
  if (!reload) warnings.push('IMPETUS_SAFE_RELOAD_COORDINATION=off — reload PM2 bloqueado');

  return {
    observability_on: observability,
    production_deployment: deployment,
    deployment_validation: validation,
    safe_reload: reload,
    rollout_safe: deployment && validation && reload,
    warnings,
    global_auto_deploy: false
  };
}

function assessDeploymentReadiness(ctx = {}) {
  const flagStatus = validateDeploymentFlags();
  const validation = validateRuntimeDeployment(ctx);
  const rollback = superviseDeploymentRollback({ ...ctx, validation });
  const health = consolidateDeploymentHealth(validation, rollback, ctx);

  const readiness_ok =
    (health.deploy_allowed || ctx.force) &&
    rollback.rollback_ready &&
    (validation.validation_passed || !flags.isDeploymentValidationEnabled() || ctx.force);

  if (!readiness_ok && flags.isDeploymentObservabilityEnabled()) {
    logProductionDeployment('DEPLOY_READINESS_FAILED', {
      composite: validation.composite_score,
      health: health.health_status,
      shadow_only: !flags.isProductionDeploymentEnabled()
    });
  }

  return {
    readiness_ok,
    flag_status: flagStatus,
    validation,
    rollback,
    health,
    observability_active: flags.isDeploymentObservabilityEnabled()
  };
}

function orchestrateProductionDeploy(ctx = {}) {
  const approved_by = ctx.approved_by;

  if (!approved_by) {
    return {
      ok: false,
      error: 'approved_by obrigatório',
      dry_run: true,
      executed: false,
      auto_deploy: false
    };
  }

  const wantsExecute = ctx.execute === true && ctx.dry_run !== true;

  if (!wantsExecute && ctx.dry_run === false) {
    return {
      ok: false,
      error: 'execute=true obrigatório para deploy real',
      dry_run: false,
      executed: false,
      auto_deploy: false,
      approved_by
    };
  }

  const dryRun = !wantsExecute;

  const readiness = assessDeploymentReadiness(ctx);

  if (dryRun) {
    recordDeployDryRun({ approved_by });
    logProductionDeployment('PRODUCTION_DEPLOY_DRY_RUN', { approved_by, readiness_ok: readiness.readiness_ok });
    const reload = coordinateSafeReload({ ...ctx, dry_run: true, approved_by });
    return {
      ok: true,
      mode: 'dry',
      dry_run: true,
      executed: false,
      auto_deploy: false,
      approved_by,
      readiness,
      reload,
      rollback: readiness.rollback
    };
  }

  if (!flags.isProductionDeploymentEnabled() && !ctx.force_deploy) {
    return {
      ok: false,
      error: 'IMPETUS_PRODUCTION_DEPLOYMENT=off — execute bloqueado',
      dry_run: false,
      executed: false,
      approved_by,
      readiness
    };
  }

  if (!readiness.readiness_ok && !ctx.force) {
    return {
      ok: false,
      error: 'Readiness não satisfeita',
      dry_run: false,
      executed: false,
      approved_by,
      readiness
    };
  }

  const reload = coordinateSafeReload({
    ...ctx,
    dry_run: false,
    execute: true,
    approved_by,
    prepare_backup: true
  });

  const executed = reload.executed === true;
  if (executed) {
    recordDeployExecution({ approved_by });
    logProductionDeployment('PRODUCTION_DEPLOY_EXECUTED', { approved_by, pm2: reload.pm2_reload_performed });
  }

  return {
    ok: executed,
    mode: 'execute',
    dry_run: false,
    executed,
    auto_deploy: false,
    approved_by,
    readiness,
    reload,
    human_supervised: true
  };
}

function getProductionDeploymentStatus() {
  return {
    layer: 'production-deployment',
    ...validateDeploymentFlags(),
    telemetry: require('./productionDeploymentTelemetry').getDeploymentTelemetry()
  };
}

module.exports = {
  validateDeploymentFlags,
  assessDeploymentReadiness,
  orchestrateProductionDeploy,
  getProductionDeploymentStatus
};
