'use strict';

function validateTenantActivation(tenantId, channel, ctx = {}) {
  if (!tenantId) {
    return { safe: true, scope: 'global', reason: 'no_tenant_scope' };
  }

  let iso = null;
  try {
    iso = require('../governanceActivation/tenantActivationIsolation');
  } catch {
    return { safe: false, reason: 'tenant_isolation_unavailable' };
  }

  const phaseI = require('../governanceActivation/config/phaseIFeatureFlags');
  if (!phaseI.isTenantSafeGovernanceEnabled() && !ctx.force) {
    return {
      safe: false,
      reason: 'tenant_safe_governance_off',
      hint: 'IMPETUS_TENANT_SAFE_GOVERNANCE=on'
    };
  }

  return {
    safe: true,
    tenant_id: String(tenantId),
    channel,
    isolation: 'tenant_scoped',
    rollback_isolated: true,
    auto_promote_all_tenants: false
  };
}

module.exports = { validateTenantActivation };
