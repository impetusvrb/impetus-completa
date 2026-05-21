'use strict';

const { listSupervisedBackups } = require('../phaseZ0/supervisedBackupCoordinator');
const { getTenantEnforcementState } = require('./tenantEnforcementState');

function assessTenantEnforcementRollbackReadiness(tenantId, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const backups = listSupervisedBackups(5);
  const latest = backups.find((b) => b.has_marker);

  return {
    tenant_id: tenantId,
    rollback_ready: !!latest?.has_marker,
    rollback_marker: state.rollback_marker,
    latest_backup: latest?.name || null,
    rollback_plan: {
      steps: [
        { step: 1, action: 'deactivate_tenant_enforcement', channel: 'all', auto: false },
        { step: 2, action: 'restore_visible_modules_from_meta', auto: false },
        { step: 3, action: 'pm2_reload_supervised', command: 'pm2 reload impetus-backend --update-env', auto: false }
      ]
    },
    auto_rollback: false,
    permanent_delete: false
  };
}

module.exports = { assessTenantEnforcementRollbackReadiness };
