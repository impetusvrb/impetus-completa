'use strict';

const { recordStabilizationSample } = require('./governanceStabilizationMonitor');

function observeTenantStability(tenantId, signals = {}) {
  recordStabilizationSample({
    tenant_id: tenantId,
    shadow_divergence: signals.shadow_divergence === true,
    degraded: signals.degraded === true,
    overblocking: signals.overblocking === true,
    leakage: signals.leakage === true
  });

  return {
    tenant_id: tenantId,
    observed: true,
    auto_remediation: false
  };
}

module.exports = { observeTenantStability };
