'use strict';

const { setTenantSummaryRolloutActive, getTenantSummaryState } = require('./tenantSummaryIsolation');

const READINESS_THRESHOLD = 0.75;

function planTenantSummaryRollback(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      rollback_prepared: true,
      tenant_id: tenantId,
      instruction: 'IMPETUS_SUMMARY_GOVERNANCE=off IMPETUS_SUMMARY_GOVERNANCE_ROLLOUT=off && pm2 reload impetus-backend --update-env',
      auto_executed: false
    };
  }
  setTenantSummaryRolloutActive(tenantId, false, { approved_by: ctx.approved_by });
  return {
    rollback_executed: true,
    tenant_id: tenantId,
    state: getTenantSummaryState(tenantId),
    approved_by: ctx.approved_by,
    manual_pm2_required: true
  };
}

module.exports = { planTenantSummaryRollback, READINESS_THRESHOLD };
