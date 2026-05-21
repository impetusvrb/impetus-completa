'use strict';

const flags = require('./config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('./phaseZ3Logger');

function observeTenantEnforcement(tenantId, before = [], after = [], ctx = {}) {
  const observation = {
    tenant_id: tenantId,
    modules_before: before,
    modules_after: after,
    pruned: before.filter((m) => !after.includes(m)),
    added: after.filter((m) => !before.includes(m)),
    phase: 'Z.3',
    menu_only: true
  };

  if (flags.isPilotRuntimeObservabilityEnabled()) {
    logPhaseZ3('PILOT_MENU_ENFORCEMENT_OBSERVED', {
      tenant_id: tenantId,
      pruned_count: observation.pruned.length,
      after_count: after.length
    });
  }

  return observation;
}

module.exports = { observeTenantEnforcement };
