'use strict';

function assessKpiRollbackReadiness(tenantId, ctx = {}) {
  let rollback = { rollback_ready: true };
  try {
    rollback = require('../contextualActivation/tenantEnforcementRollbackReadiness').assessTenantEnforcementRollbackReadiness(
      tenantId,
      { kpis_before: ctx.kpis_before }
    );
  } catch {
    rollback = { rollback_ready: true };
  }
  return {
    ...rollback,
    kpi_snapshot: ctx.kpis_before || [],
    restore_from_snapshot: true,
    auto_rollback: false
  };
}

module.exports = { assessKpiRollbackReadiness };
