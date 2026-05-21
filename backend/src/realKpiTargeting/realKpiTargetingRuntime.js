'use strict';

const { isRealEnforcementActiveForTenant } = require('../realTenantEnforcement/realTenantEnforcementSupervisor');
const { runTenantKpiEnforcementRuntime } = require('../kpiRuntimeEnforcement/tenantKpiEnforcementRuntime');

function runRealKpiTargetingRuntime(kpis = [], user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isRealEnforcementActiveForTenant(tenantId, ctx) && !ctx.force_real_kpi) {
    return { kpis: [...kpis], enforcement_applied: false, shadow_only: true };
  }
  const pipeline = runTenantKpiEnforcementRuntime(kpis, user, { ...ctx, force_kpi_pipeline: true });
  return { ...pipeline, shadow_only: false, real_targeting: true };
}

module.exports = { runRealKpiTargetingRuntime };
