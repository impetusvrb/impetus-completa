'use strict';

const flags = require('./config/phaseZ5FeatureFlags');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { isPilotTenant, getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { validateTenantKpiReadiness } = require('./tenantKpiReadinessValidator');
const { getKpiRuntimeEnforcementStatus } = require('./kpiRuntimeEnforcementFacade');

function superviseTenantKpiEnforcement(tenantId, user = {}, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const readiness = validateTenantKpiReadiness(tenantId, user, ctx);
  return {
    tenant_id: tenantId,
    pilot: isPilotTenant(tenantId),
    registry: getPilotTenant(tenantId),
    state,
    readiness,
    status: getKpiRuntimeEnforcementStatus({ tenant_id: tenantId }),
    kpi_enforcement_enabled:
      flags.isKpiRuntimeEnforcementEnabled() && flags.isTenantKpiEnforcementEnabled(),
    summary_blocked: true,
    chat_blocked: true
  };
}

module.exports = { superviseTenantKpiEnforcement };
