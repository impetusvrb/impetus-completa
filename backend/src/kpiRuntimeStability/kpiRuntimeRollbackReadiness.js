'use strict';

function assessKpiRuntimeRollbackReadiness(tenantId, ctx = {}) {
  let rollback = { rollback_ready: true };
  try {
    rollback = require('../kpiPilotObservability/kpiRollbackReadiness').assessKpiRollbackReadiness(tenantId, ctx);
  } catch {
    rollback = { rollback_ready: true, kpi_snapshot: ctx.kpis_before || [] };
  }
  return rollback;
}

module.exports = { assessKpiRuntimeRollbackReadiness };
