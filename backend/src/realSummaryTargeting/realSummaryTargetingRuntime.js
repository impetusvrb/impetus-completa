'use strict';

const { isRealEnforcementActiveForTenant } = require('../realTenantEnforcement/realTenantEnforcementSupervisor');
const { runSummaryEnforcementPipeline } = require('../summaryRuntimeActivation/summaryEnforcementRuntime');

function runRealSummaryTargetingRuntime(payload = {}, user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isRealEnforcementActiveForTenant(tenantId, ctx) && !ctx.force_real_summary) {
    return { payload, enforcement_applied: false, shadow_only: true };
  }
  const pipeline = runSummaryEnforcementPipeline(payload, user, { ...ctx, force_summary_pipeline: true });
  return { ...pipeline, shadow_only: false, real_targeting: true, fabricated: false };
}

module.exports = { runRealSummaryTargetingRuntime };
