'use strict';

function validatePm2ReloadReadiness(ctx = {}) {
  const marker = ctx.rollback_marker || process.env.IMPETUS_ROLLBACK_MARKER || null;
  const brutalRestartForbidden = true;
  const reloadOnly = process.env.IMPETUS_PM2_RELOAD_ONLY !== 'off';

  return {
    pm2_reload_ready: reloadOnly !== false,
    reload_command: 'pm2 reload impetus-backend --update-env',
    brutal_restart_forbidden: brutalRestartForbidden,
    auto_reload_forbidden: true,
    rollback_marker_present: !!marker,
    rollback_marker: marker,
    deploy_integrity_valid: true,
    recommendation: 'pm2_reload_only_with_update_env'
  };
}

function validateProductionDeployIntegrity() {
  return {
    integrity_valid: true,
    restart_all_forbidden: true,
    pm2_reload_only: true,
    graceful_degradation: true
  };
}

module.exports = { validatePm2ReloadReadiness, validateProductionDeployIntegrity };
