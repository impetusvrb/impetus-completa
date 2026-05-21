'use strict';

const flags = require('./config/phaseZ13EnforcementFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { assessTenantEnforcementRollbackReadiness } = require('../contextualActivation/tenantEnforcementRollbackReadiness');

function isRealEnforcementActiveForTenant(tenantId, ctx = {}) {
  if (!flags.isRealTenantEnforcementEnabled() && !ctx.force_real_enforcement) return false;
  if (!isPilotTenant(tenantId) && !ctx.force_real_enforcement) return false;
  const state = getTenantEnforcementState(tenantId);
  return state.enforcement_active === true || ctx.force_real_enforcement === true;
}

function superviseRealTenantEnforcement(tenantId, user = {}, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const rollback = assessTenantEnforcementRollbackReadiness(tenantId, ctx);
  let readiness = { enforcement_ready: false };
  try {
    readiness = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').assessIdentityReadiness(
      user,
      { ...ctx, tenant_id: tenantId }
    );
  } catch {
    /* optional */
  }

  return {
    phase: 'Z.13',
    tenant_id: tenantId,
    pilot: isPilotTenant(tenantId),
    real_enforcement_active: isRealEnforcementActiveForTenant(tenantId, ctx),
    state,
    rollback,
    identity_readiness: readiness,
    flags: {
      contextual_activation: flags.isRealTenantEnforcementEnabled(),
      menu: flags.isSafeMenuEnforcementEnabled(),
      kpi: flags.isKpiRuntimeEnforcementEnabled(),
      summary: flags.isSummaryRuntimeObservabilityEnabled()
    },
    shadow_only: !isRealEnforcementActiveForTenant(tenantId, ctx),
    chat_enforcement: false,
    boundary_enforcement: false,
    auto_remediate: false
  };
}

module.exports = { isRealEnforcementActiveForTenant, superviseRealTenantEnforcement };
