'use strict';

const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function validateRuntimeActivationSafety(tenantId, ctx = {}) {
  if (!isPilotTenant(tenantId) && !ctx.force) {
    return { safe: false, reason: 'not_pilot_tenant' };
  }

  const state = getTenantEnforcementState(tenantId);
  let z11Ready = true;
  try {
    const z11 = require('../runtimeOperationalScaling/runtimeOperationalScalingFacade');
    const pack = z11.applyRuntimeOperationalScaling(
      { company_id: tenantId },
      {},
      { tenant_id: tenantId, force_scaling: ctx.force }
    );
    z11Ready =
      pack.runtime_scaling_readiness?.scaling_safe !== false &&
      pack.governance_load_protection?.entropy?.runtime_entropy_detected !== true;
  } catch {
    z11Ready = ctx.force === true;
  }

  let kpiRollback = { rollback_safe: false };
  let summaryRollback = { rollback_safe: false };
  try {
    kpiRollback = require('../kpiPilotObservability/kpiRollbackReadiness').assessKpiRollbackReadiness(tenantId, ctx);
    summaryRollback = require('../summaryRuntimeActivation/summaryRuntimeRollbackReadiness').assessSummaryRollbackReadiness(
      tenantId,
      ctx
    );
  } catch {
    /* optional */
  }

  const menuFirst = state.channels.menu === true;
  const safe =
    menuFirst &&
    z11Ready &&
    (kpiRollback.rollback_safe || !state.channels.kpi) &&
    (summaryRollback.rollback_safe || !state.channels.summary);

  return {
    safe: safe || ctx.force === true,
    menu_active: menuFirst,
    kpi_rollback: kpiRollback,
    summary_rollback: summaryRollback,
    z11_ready: z11Ready,
    auto_activation_forbidden: true
  };
}

module.exports = { validateRuntimeActivationSafety };
