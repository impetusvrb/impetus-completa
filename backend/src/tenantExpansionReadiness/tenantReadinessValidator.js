'use strict';

const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function validateTenantExpansionReadiness(tenantId, pack = {}) {
  if (!isPilotTenant(tenantId)) {
    return { ready: false, reason: 'not_pilot_tenant', auto_expand: false };
  }
  const state = getTenantEnforcementState(tenantId);
  const maturity = pack.maturity?.maturity_score ?? 0;
  const stable = pack.stability?.unstable !== true;
  const sustainable = pack.sustainability?.sustainability_score >= 0.5;

  const ready = state.channels.menu && state.channels.kpi && maturity >= 0.55 && stable && sustainable;

  return {
    ready,
    menu_active: state.channels.menu,
    kpi_active: state.channels.kpi,
    summary_active: state.channels.summary,
    chat_blocked: true,
    auto_expand: false,
    recommendation_only: true
  };
}

module.exports = { validateTenantExpansionReadiness };
