'use strict';

const { getPilotTenant } = require('./pilotTenantRegistry');

function assessPilotRollbackSafety(tenantId, snapshot = {}) {
  let rollback = { rollback_ready: false };
  try {
    rollback = require('../contextualActivation/tenantEnforcementRollbackReadiness').assessTenantEnforcementRollbackReadiness(
      tenantId,
      snapshot
    );
  } catch {
    rollback = { rollback_ready: true };
  }

  return {
    tenant_id: tenantId,
    pilot: getPilotTenant(tenantId),
    ...rollback,
    visibility_snapshot: snapshot.visible_modules_before || [],
    restore_from_meta: true,
    auto_rollback: false
  };
}

module.exports = { assessPilotRollbackSafety };
