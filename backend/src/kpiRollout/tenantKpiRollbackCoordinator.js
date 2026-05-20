'use strict';

const { setTenantKpiRolloutActive, getTenantKpiState } = require('./tenantKpiIsolation');

const READINESS_THRESHOLD = 0.75;

function planTenantKpiRollback(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      rollback_prepared: true,
      tenant_id: tenantId,
      instruction: 'IMPETUS_KPI_GOVERNANCE=off IMPETUS_KPI_GOVERNANCE_ROLLOUT=off && pm2 reload impetus-backend --update-env',
      auto_executed: false
    };
  }
  setTenantKpiRolloutActive(tenantId, false, { approved_by: ctx.approved_by });
  return {
    rollback_executed: true,
    tenant_id: tenantId,
    state: getTenantKpiState(tenantId),
    approved_by: ctx.approved_by,
    manual_pm2_required: true
  };
}

module.exports = { planTenantKpiRollback, READINESS_THRESHOLD };
