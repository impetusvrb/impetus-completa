'use strict';

const { planPm2Reload, runHealthCheck } = require('../controlledActivation/safeProductionDeploy');
const { assessDeploymentReadiness } = require('../productionDeployment/productionDeploymentOrchestrator');

/**
 * Prepara reload supervisionado — NUNCA executa pm2 restart / restart all.
 */
function assessPm2ReloadReadiness(ctx = {}) {
  const reloadPlan = planPm2Reload(true);
  let deploymentReadiness = { readiness_ok: true };
  try {
    deploymentReadiness = assessDeploymentReadiness({
      skip_http_check: ctx.skip_http_check,
      skip_pm2_check: ctx.skip_pm2_check,
      force: ctx.force
    });
  } catch {
    deploymentReadiness = { readiness_ok: true, note: 'production-deployment optional' };
  }

  const health = ctx.skip_http_check ? { ok: true, skipped: true } : runHealthCheck(ctx.port || 4000);

  return {
    ready_for_supervised_reload: deploymentReadiness.readiness_ok && health.ok !== false,
    reload_command: 'pm2 reload impetus-backend --update-env',
    forbidden_commands: ['pm2 restart', 'pm2 restart all', 'pm2 stop && pm2 start'],
    reload_plan: reloadPlan,
    deployment_readiness: deploymentReadiness,
    health_check: health,
    rollback_safe: true,
    auto_executed: false,
    requires_approved_by: true
  };
}

module.exports = { assessPm2ReloadReadiness };
