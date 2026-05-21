'use strict';

const flags = require('../kpiRuntimeEnforcement/config/phaseZ5FeatureFlags');

function collectKpiPilotRuntimeObservability(pack = {}) {
  return {
    phase: 'Z.5',
    observability_active: flags.isKpiPilotObservabilityEnabled(),
    tenant_id: pack.tenant_id,
    enforcement_applied: pack.pipeline?.enforcement_applied === true,
    degradation_safe: pack.pipeline?.integrity?.frontend_safe !== false
  };
}

module.exports = { collectKpiPilotRuntimeObservability };
