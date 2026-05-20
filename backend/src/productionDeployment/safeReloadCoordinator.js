'use strict';

const flags = require('./config/productionDeploymentFeatureFlags');
const { logProductionDeployment } = require('./productionDeploymentLogger');
const { executeSafeDeploySteps, planPm2Reload, createBackup } = require('../controlledActivation/safeProductionDeploy');

function coordinateSafeReload(ctx = {}) {
  const sequence = [
    { step: 1, action: 'validate_flags', required: ['IMPETUS_PRODUCTION_DEPLOYMENT'] },
    { step: 2, action: 'backup_env', fn: 'createBackup' },
    { step: 3, action: 'optional_frontend_build', skip: ctx.skip_build === true },
    { step: 4, action: 'pm2_reload', ...planPm2Reload(true) },
    { step: 5, action: 'post_reload_health', endpoint: '/api/health' }
  ];

  logProductionDeployment('SAFE_RELOAD_PLANNED', {
    approved_by: ctx.approved_by,
    dry_run: ctx.dry_run !== false,
    auto_executed: false
  });

  const dryRun = ctx.dry_run !== false || !ctx.execute;
  const mayExecute =
    ctx.execute === true &&
    !!ctx.approved_by &&
    flags.isProductionDeploymentEnabled() &&
    flags.isSafeReloadCoordinationEnabled() &&
    !dryRun;

  let steps = [];
  if (mayExecute) {
    steps = executeSafeDeploySteps({
      dry_run: false,
      skip_pm2: false,
      skip_build: ctx.skip_build === true,
      skip_backup: ctx.skip_backup === true,
      port: ctx.port
    }).steps;
  } else {
    steps = executeSafeDeploySteps({
      dry_run: true,
      skip_pm2: true,
      skip_build: true,
      port: ctx.port
    }).steps;
    if (!ctx.skip_backup && ctx.prepare_backup) {
      steps.unshift({ step: 'backup_preview', result: createBackup('production-deployment') });
    }
  }

  return {
    sequence,
    steps,
    dry_run: !mayExecute,
    executed: mayExecute,
    auto_executed: false,
    pm2_reload_performed: mayExecute && steps.some((s) => s.step === 'pm2_reload' && s.result?.ok),
    approved_by: ctx.approved_by || null,
    requires_flags: {
      IMPETUS_PRODUCTION_DEPLOYMENT: flags.isProductionDeploymentEnabled(),
      IMPETUS_SAFE_RELOAD_COORDINATION: flags.isSafeReloadCoordinationEnabled()
    }
  };
}

module.exports = { coordinateSafeReload };
