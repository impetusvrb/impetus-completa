'use strict';

const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function validateTenantScaling(tenantId, pack = {}) {
  if (!isPilotTenant(tenantId) && !pack.force) {
    return { valid: false, reason: 'not_pilot_tenant', scaling_safe: false, auto_expand: false };
  }
  const mature = pack.classification?.classification === 'mature_scalable';
  const stable = pack.scaling_stability?.scaling_instability_detected !== true;
  const protected_ = pack.governance_load_protection?.entropy?.protected !== false;

  return {
    valid: mature && stable && protected_,
    scaling_safe: stable && protected_ && !pack.risk?.high_risk,
    auto_expand: false
  };
}

module.exports = { validateTenantScaling };
