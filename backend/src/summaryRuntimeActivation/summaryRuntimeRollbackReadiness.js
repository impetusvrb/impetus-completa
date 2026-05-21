'use strict';

const { isPilotTenant, getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { getSummaryRuntimeMeta } = require('./summaryRuntimeState');

function assessSummaryRollbackReadiness(tenantId, ctx = {}) {
  if (!isPilotTenant(tenantId)) {
    return { ready: false, reason: 'not_pilot_tenant', rollback_safe: false };
  }
  const state = getTenantEnforcementState(tenantId);
  const pilot = getPilotTenant(tenantId);
  const meta = getSummaryRuntimeMeta(tenantId);
  const hasSnapshot = !!(pilot?.summary_snapshot || meta.summary_snapshot || ctx.summary_before);
  const kpiActive = state.channels.kpi === true;
  const menuActive = state.channels.menu === true;

  const ready = menuActive && kpiActive && hasSnapshot;

  return {
    ready,
    rollback_safe: ready,
    menu_active: menuActive,
    kpi_active: kpiActive,
    summary_snapshot_present: hasSnapshot,
    rollback_marker: state.rollback_marker || meta.rollback_marker,
    recommendation: ready ? 'activation_allowed' : 'complete_kpi_channel_and_snapshot_first'
  };
}

module.exports = { assessSummaryRollbackReadiness };
